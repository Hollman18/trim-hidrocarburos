# U2 · El modelo choke en pantalla: «¿Dónde se trabó?» y «Qué limita hoy al campo»

**21-oct-2026 · Diseñador de experiencia · Parte del plan maestro** (`PLAN-MAESTRO.md`). Es el diseño de experiencia de la construcción del choke que ordenó el dueño ese mismo día («implementémoslo completo…», `CHOKE-CONSTRUCCION.md`). No se tocó código.

Este documento es la **tanda 0** de `CHOKE-CONSTRUCCION.md`: la experiencia que siguen el motor (E1, E3), el contrato (C1) y las pantallas (P1-UI a P4-UI). Continúa `U1-experiencia.md` (§0–§3, §9 y §10) y diseña en pantalla las 12 piezas de `CHOKE-COMPLETO.md`. Usa el vocabulario de `P1-producto.md` (§1.2, §1.3, §1.6, §1.7, §2.1, §3.3 y §3.4). Donde mejora o contradice a U1, a P1 o a CHOKE-COMPLETO, lo dice en el mismo punto y lo junta en §12.

> Estado: COMPLETO (§0 a §12, bocetos y fuentes). Las cifras salen del demo, con su marca (ver «Cómo leer las cifras»).

## Índice
- Cómo leer las cifras
- Resumen
- §0 Principios de esta experiencia
- §1 Las palabras
- §2 «La tubería del campo»
- §3 Por rol
- §4 El paso «¿Dónde se trabó?» en Identificar
- §5 «La tubería del agua»
- §6 «Si falla hoy»
- §7 El choke en el tiempo
- §8 Configuración: la filosofía operacional
- §9 Bocetos ASCII
- §10 Pruebas con usuarios
- §11 Pedidos a motor y producto
- §12 Desacuerdos y mejoras frente a U1, P1 y CHOKE-COMPLETO
- Fuentes

## Cómo leer las cifras

Cada número lleva una de estas tres marcas:

- **[demo]**: sale del código del demo tal como está. Puede venir de una función del motor (`estadoCampo`, `prediccion`, `ordenDeCierre`, `riesgoAhora`, `historialDeEquipo`, `libro`) o de un dato de `planta.ts`, `configuracion.ts`, `bombas.ts` o `pozos.ts`. Las cifras se leyeron corriendo el motor del demo **en modo de solo lectura**, desde un script fuera del repositorio que no cambia ningún archivo.
- **[cálculo U2]**: lo saqué para este documento con las funciones del motor que ya existen, aplicando las fórmulas de `CHOKE-COMPLETO.md` §3 a los datos del demo. **El motor todavía no lo produce.** Sirve además como caso de referencia propuesto para `referencia/choke/` (CHOKE-COMPLETO §14, punto 9).
- **(ejemplo)**: cifra ilustrativa. **No es un dato.**

El reloj del demo marca el **2-oct-2026 a las 14:00** (`AHORA`, `src/entities/reloj.ts:7`). «Hoy» y «ahora» se refieren a ese momento. Ese día la P-201B de La Ceiba está parada desde las 03:52 y el tanque de agua está al 89,6 % [demo].

Para el gerente, los períodos que se citan son los de la cabecera: «Octubre, en curso» (del 1 al 2 de octubre) y «Septiembre, cerrado».

## Resumen

1. **Nadie necesita saber qué es un «choke».**
   - Las preguntas en pantalla son «¿Dónde se trabó?» para cada parada, «Qué limita hoy al campo» para el campo y «Si falla hoy» para cada equipo.
   - «Choke» aparece solo como rótulo secundario con ⓘ, en Regulatorio, Confiabilidad y Configuración. El ⓘ explica el método de BP de 1996 (SPE-36848), que usa la NSTA y que adoptó la ANH (§1).
2. **Los cuatro tramos, en palabras de campo:** «En el yacimiento», «En el pozo», «En la planta o estación» y «Afuera». «Afuera» tiene subniveles (oleoducto, cliente, nominación), y ahí cabe «Mercado» (§1.1).
3. **«La tubería del campo» es el dibujo central** (§2):
   - el alto de cada tramo es proporcional a lo que deja pasar;
   - el tramo que limita lleva doble contorno y la palabra «limita», en gris y nunca en rojo;
   - el nivel oscuro es lo que pasa hoy;
   - debajo de cada tramo va lo que se perdió ahí;
   - «sin identificar» queda aparte, en gris discontinuo.
   Vive en Producción y en Planta. El gerente no la ve.
4. **El hallazgo que ordena el diseño:** en el demo, **lo que limita y lo que más cuesta si falla no son lo mismo**.
   - En La Ceiba limitan los pozos (11.360 bbl/d), casi empatados con el tren de crudo (12.000).
   - El agua nunca fue el tramo más angosto en 13 meses, pero es el **más frágil**: sin bomba de sobra, si para una faltan 44.100 bbl/d de agua y el tanque aguanta 1 a 3 h.
   - Por eso son tres preguntas con tres marcas (§0, principio 2; §5.4; §7.1).
5. **Gerente:** una barra por campo, «dónde se trabó», en barriles y con su frase, más la pérdida aparte. Por ejemplo: septiembre de La Ceiba, 87 % en los pozos (LC-11, LC-04) (§3, §9.2).
6. **Identificar:**
   - TRIM propone el eslabón 2 con su porqué y los nombres («porque P-201B saca el agua de los 18 pozos»).
   - Confirman sup, prod, jefe o conf, en 1 toque, 2 por grupo o 3 para corregir.
   - El operador nunca escoge el tramo.
   - «En el yacimiento» lo ponen solo producción o confiabilidad, con evidencia.
   - Se resuelven nueve casos difíciles con ejemplos reales del demo, entre ellos una regla nueva para la baja tensión de un solo pozo (§4).
7. **La tubería del agua y «Si falla hoy»:**
   - Con las tres frases del colchón y la orden de cerrar primero los «pozos acuatosos» (Edinson [31:08]), la bomba de reinyección se entiende crítica sin teoría (§5).
   - La lista dinámica muestra que, con P-201B parada, **P-201A y P-201C suben al tercer puesto y no tienen instrumento** (§6).
8. **En el tiempo:** «casi iguales» y un aviso con umbral y persistencia. Sin eso, La Ceiba cambiaría 7 veces en 13 meses. «Antes → con TRIM» va por tramo y muestra la flecha que baja y la que sube (§7).
9. **Configuración:** una página, «Filosofía operacional» (la palabra de Edinson), con una sola pregunta por equipo: «¿A qué pozos sirve?». TRIM deduce el tramo, propone la topología desde la historia, valida las capacidades, muestra el impacto y pide firma. El transformador de 2 o 3 pozos de una locación queda marcado como caso de borde (§8).
10. **Pedidos y desacuerdos:**
    - 33 pedidos al motor y al producto (§11), alineados con lo que E1 ya escribió en `choke.ts` (§11.0);
    - 19 puntos frente a U1, P1, CHOKE-COMPLETO y ese motor (§12).
    - El más urgente: **el gas sin medir no puede decidir lo que limita**. Hoy `potencialesDelCampo` dice que a la planta de La Ceiba «le sobran 40 bbl/d» por un gas declarado; sin él son 640 (§11.3).

## §0 Principios de esta experiencia

El principio rector es uno: **nadie necesita saber qué es un «choke» para usarlo.** Los siete de abajo lo vuelven reglas de pantalla.

**1. Se pregunta con palabras de campo, y el nombre técnico va de segundo.**
- Para cada parada, la pantalla pregunta «¿Dónde se trabó?». Para el campo dice «Qué limita hoy al campo». Para cada equipo, «Si falla hoy».
- La palabra «choke» aparece solo como rótulo secundario, con su ⓘ, en tres lugares: Regulatorio, Confiabilidad y Configuración (§1.3).
- *Por qué:* en campo, «choke» es la válvula de la cabeza del pozo. La misma circular advierte que el choke del reporte «se distingue técnicamente de la válvula de estrangulamiento» (C24 p. 4). Con la palabra en pantalla, el operador entendería otra cosa. Es la regla de palabras de campo de U1 §1.0, punto 7.

**2. Tres preguntas distintas llevan tres marcas distintas, y nunca se mezclan.**
- **«¿Dónde se trabó?»** es de **cada parada**: dónde empezó lo que la paró. Es el paso 2 de la circular.
- **«Qué limita hoy al campo»** es del **campo**: el tramo que menos deja pasar.
- **«Si falla hoy»** es de **cada equipo**: cuánto bajaría lo que sale del campo si ese equipo para.
- *Por qué:* en el demo, las tres respuestas no coinciden.
  - En La Ceiba hoy **limitan los pozos**: 11.360 bbl/d, con el tren de crudo de la planta casi igual, en 12.000 [cálculo U2].
  - El tramo que **más cuesta si falla** es otro: el agua. Las tres bombas de reinyección no tienen una cuarta de sobra, y si para una hay que cerrar pozos [demo].
  - Si las tres preguntas se mezclan, el vigía y el repuesto se mandan al lugar equivocado.
  - U1 §3.2 las mezclaba en la línea del supervisor («Hoy limita: Planta · disposición de agua (P-201B fuera…)»). Ver §12, punto 1.

**3. TRIM propone y explica en una frase. La persona confirma. El operador nunca escoge el tramo.**
- Cada propuesta lleva su porqué en palabras de campo, por ejemplo: «porque P-201B saca el agua de los 18 pozos».
- Confirman el supervisor, producción, el jefe de mantenimiento o confiabilidad (`PASOS_QUE_CONFIRMA`, P1 §1.3).
- El operador contesta lo que vio: si el corte vino del pórtico o del transformador del pozo, o si el oleoducto recibía. Con eso, TRIM propone el tramo.
- *Por qué:* lo confirmado tiene que significar que una persona competente lo miró (S1, riesgo R-E). La circular pide que clasifiquen «los ingenieros y operadores del campo» (C24 p. 5).

**4. Lo que limita no es una alarma: se marca con gris, forma y texto. El color es del equipo, no del tramo.**
- El tramo que limita lleva un contorno más grueso, un triángulo ◄ y la palabra «limita».
- El único color del dibujo es la marca de un equipo con alarma, por ejemplo P-201B parada, con la paleta vigente (U1 §9).
- *Por qué:* todo campo tiene siempre un tramo que limita. Si se pintara de rojo, habría rojo todo el día y el rojo dejaría de servir (ISA-101: gris lo normal; ISA-18.2: una alarma pide una acción).

**5. Nada se reparte para que cuadre: lo que no se sabe se ve como «falta», en gris discontinuo.**
- Las paradas sin causa van en su propio bloque, «sin identificar».
- *Por qué:* lo dicen CHOKE-COMPLETO §6 («lo sin explicar se muestra como "sin explicar"») y U1 §1.0, punto 5.
- En el demo, el 33,9 % del diferido de octubre de La Ceiba todavía no tiene causa: LC-21 y LC-08 suman 355 de 1.046 bbl [demo]. Si se escondiera, el gerente vería un reparto falso.

**6. La misma cifra arriba de todas las vistas.**
- El reparto por tramo suma exacto el diferido del libro.
- Los 1.046 bbl de La Ceiba en octubre son los mismos en Resumen, en Diferidos y debajo de la tubería.
- *Por qué:* lo piden U1 §1.0, punto 3, y CHOKE-COMPLETO §14, invariantes 2 y 3. Un número que cambia según la pantalla no se cree.

**7. Una cifra que el sistema cambia solo tiene que ser estable antes de avisar.**
- «Cambió lo que limita» avisa solo si se cumplen dos condiciones:
  - el nuevo tramo gana por más que un umbral de «casi igual»;
  - y el cambio se sostiene unos días.
- Mientras dos tramos están dentro del umbral, la pantalla dice «casi iguales» y no avisa.
- *Por qué:* en La Ceiba, los pozos y el tren de crudo se turnan el primer lugar **siete veces en 13 meses**, con 0 % a 6,5 % de diferencia [cálculo U2, §7.1].
  - Con un umbral de 3 % (ejemplo), quedan **un cambio** en La Ceiba (agosto) y **ninguno** en Guacamayo, que sin umbral tendría cinco [cálculo U2].
  - Un aviso por cada vuelta sería ruido. Según ISA-18.2, una alarma que no pide acción no es alarma.
- El umbral es una decisión de producto, a validar con Edinson. **No** sirve la banda del factor de asignación (±15 % en La Ceiba, Res. MME 40236 [demo]): es el límite regulatorio del factor, no el error de las pruebas, y con ella casi todo sería empate.

## §1 Las palabras

### 1.1 Los cuatro tramos en palabras de campo

Los valores internos son los de P1 (`ChokeAnh`: `reservorio`, `pozo`, `planta`, `exportacion`). En las pantallas de campo y del gerente se dicen así:

| Interno (`ChokeAnh`) | Palabra en pantalla | Una línea que lo explica | Ejemplos con equipos del demo |
|---|---|---|---|
| `reservorio` | **«En el yacimiento»** | «El problema fue de la roca o del fluido, no de un equipo: el pozo no tenía qué dar.» | No hay ninguno en el demo [demo]. Ejemplos de la ANH: conificación de agua, declinación abrupta, conectividad (anexo C-003, vía R2 §3.0). Caso posible en el demo: la P-201B de Guacamayo es de **recobro**; si sigue parada semanas, baja la presión del yacimiento («el efecto llega en semanas», `diferido.ts`, `prediccion`) (ejemplo) |
| `pozo` | **«En el pozo»** | «Solo afectó a este pozo: su bomba de fondo, su varilla, su cabeza, su línea o lo eléctrico que es solo suyo.» | Electrosumergible de **LC-11** (3.677 bbl en septiembre) · bombeo mecánico de **PA-07** (2.687 bbl en septiembre) · **LC-06**: «Cabeza de pozo con fuga en el prensaestopas» (14-ago) · **MN-22**: «Fuga en la línea de flujo del pozo» (30-sep) · **PA-04**: «Varilla pulida rayada» (21-jun) [demo] |
| `planta` | **«En la planta o estación»** | «Afectó a varios pozos: lo compartido, desde el cabezal de producción hasta la salida de la batería, y los servicios del campo.» | **P-201B**, bomba de reinyección: saca el agua de los 18 pozos de La Ceiba · **MPP-301**, multifásica del clúster norte (MN-07, MN-18, MN-33) · **K-101**, aire de instrumentos (todo el campo) · **SE-2**, pórtico de 13,8 kV (18 pozos en La Ceiba, 41 en Morichal) · **C-401**, compresor · **V-101**, separador · **TK-102** y **LACT-01** cuando la falla es del equipo propio [demo] |
| `exportacion` | **«Afuera»** | «Fuera de la batería: el oleoducto, el transportador o el cliente no recibieron.» | Guacamayo: «Tanque de crudo alto: despacho limitado por la nominación del oleoducto» (LACT-01; 15.179 bbl en 12 meses), cuando una persona confirme que el oleoducto no recibía · La Zarza: «El comprador nominó menos gas: se cerró el pozo» (ZA-01, ZA-03, ZA-04, ZA-06) [demo] |

- **«Afuera» tiene tres subniveles**, que aparecen solo cuando se abre el detalle:
  - «el oleoducto o el transportador»;
  - «el terminal o el cliente no recibe»;
  - «nominación».

  Así se resuelve «Mercado», que existe en el demo y no en la ANH: es un subnivel de «Afuera» y nunca un quinto tramo (CHOKE-COMPLETO §2; U1 §3.3).
- **El botón dice «En la planta o estación»**. En el teléfono, si no cabe, se corta a «En la planta».
  - La palabra «estación» va porque la usa la propia ANH: el N2 «Parada estación/bombeo afecta pozos» (Tabla 1) y el anexo de la C-003, que habla de «paradas de estaciones que afectan múltiples pozos» (vía R2 §3.2).
  - Que también sea la palabra de campo para la batería que recibe varios pozos se prueba con Edinson (§10.2, pregunta 5).
- **Los rótulos de la ANH no desaparecen.** P1 §1.2 los fija como «Pozo», «Planta», «Exportación (evacuación)» y «Reservorio». Quedan para Regulatorio y para el ⓘ del paso 2. Ver §12, punto 4.

### 1.2 Las cuatro frases que mandan

| Pregunta | Frase en pantalla | De qué es | Dónde aparece |
|---|---|---|---|
| ¿Dónde empezó lo que paró este pozo? | **«¿Dónde se trabó?»** | De cada parada (paso 2 de la circular) | Identificar, Turno, Diferidos, Resumen del gerente |
| ¿Cuál tramo es el más angosto? | **«Qué limita hoy al campo»** | Del campo, calculado cada día | Producción, Planta, Turno (una línea) |
| ¿Cuánto costaría que este equipo fallara ahora? | **«Si falla hoy»** | De cada equipo, cambia con lo que esté parado | Confiabilidad, Riesgo, Superficie, ficha del equipo |
| ¿Qué está costando barriles en este momento? | **«Perdiéndose ahora»** (la frase que ya usan Turno y Riesgo) | De las paradas abiertas | Turno, Riesgo, debajo de la tubería |

No se inventa una quinta frase para «lo que está parado ahora»: se reusa «Perdiéndose ahora», que ya existe en `Turno.tsx` y `Riesgo.tsx`.

### 1.3 «Choke» como rótulo secundario: dónde va y qué dice su ⓘ

- **Dónde aparece:**
  - en Regulatorio (`reg`), al lado de cada `choke_mod`;
  - en Confiabilidad (`conf`), en el título de «Si falla hoy»;
  - en Configuración (`adm`), en «Filosofía operacional»;
  - en el ⓘ del paso «¿Dónde se trabó?», que puede abrir cualquiera.
- **Forma:** texto chico y gris debajo del título, «modelo choke ⓘ». Nunca va en un botón, en una opción ni en un mensaje de WhatsApp.
- **El ⓘ, en dos líneas** (texto exacto):
  > «Es un método internacional para ubicar dónde se pierde producción: lo publicó BP en 1996 (artículo SPE-36848), lo usa el regulador británico (NSTA) y la ANH lo adoptó en 2026 (Circulares 003 y 024).
  > No es la válvula choke de la cabeza del pozo (Circular 024, p. 4).»

  Fuentes: R2 §1.1 (Palen y Goodwin, BP, 1996, verificado en Crossref; NSTA, *UKSS Production Efficiency Section Guide 2025*, §5.2); C24 p. 4; transcript [26:48], donde Edinson dice que el árbol «está copiado del modelo choque» y cita las Circulares 24 y 3 de 2026.

### 1.4 Palabras prohibidas

Valen en las pantallas de `oper`, `tec`, `sup`, `ger` y `cont`. Los roles de ingeniería (`prod`, `conf`, `jefe`) pueden ver los términos técnicos en el ⓘ, nunca en el rótulo principal.

| No se dice | Se dice | Por qué |
|---|---|---|
| «choke», «choke_mod», «modelo choke» | «¿Dónde se trabó?», «Qué limita hoy» | §0, principio 1. Solo como rótulo secundario (§1.3) |
| «choque» | — | Así quedó en el transcript [26:48], pero es error de transcripción. En pantalla nunca |
| «dominante», «estructural», «SMPP», «MPP», «PE» | «lo que limita», «el tramo más angosto», «eficiencia» (ya está en Producción) | Siglas de la NSTA que nadie usa en campo |
| «cuello de botella» | «lo que limita» | Una palabra por idea. La circular usa «cuello de botella» para el choke **de la parada** (C24 p. 5, Paso 2): en pantalla confundiría las dos preguntas |
| «Exportación» y «evacuación» en pantallas de campo | «Afuera» | «Exportación» suena a venta al exterior. «Evacuación» ya nombra en TRIM a los equipos **propios** de despacho (TK-102, LACT-01; `TIPO_CAUSA.evacuacion`), que son de la planta (P1 §3.3): usarla para el tramo de afuera mezclaría dos cosas. El operador dice «el oleoducto no recibió» |
| «Reservorio» | «Yacimiento» | Es la palabra usual en Colombia. «Reservorio» queda para Regulatorio |
| «Mercado» como tramo | «Afuera · el cliente no recibió» | La ANH no lo tiene (§1.1) |
| «brecha», «gap», «brecha de desempeño, de disponibilidad, de capacidad» | «lo que no se produjo», «planeado / no planeado» (ya existe), «frecuencia bajada» | La escalera de CHOKE-COMPLETO §7 es del motor y de confiabilidad, no del campo |
| «culpa», «culpable», «falló el transportador» | «el oleoducto no recibió», «se trabó afuera» | Principio de **neutralidad técnica** de la circular: «el reporte no prejuzga responsabilidad contractual» (C24 p. 5). «Dónde se trabó» es un lugar, no un juicio |
| «crítico» para el tramo que limita | «limita» | «Crítico» es de los equipos (criticidad 1–5, `equipos.ts`) |
| «holgura» para `oper`, `sup` y `ger` | «le sobran X bbl/d» | «Holgura» ya está en Planta para ingeniería (`Planta.tsx`, «Capacidad por tren»): ahí se queda |

### 1.5 Textos exactos

**Paso «¿Dónde se trabó?» (Identificar):**

| Elemento | Texto exacto |
|---|---|
| Rótulo del paso | «¿Dónde se trabó?» |
| Opciones (orden fijo) | «En el pozo» · «En la planta o estación» · «Afuera (oleoducto, transportador o cliente)» · «En el yacimiento» |
| Línea debajo de cada opción, en el selector | «Solo afectó a este pozo» · «Afectó a varios pozos» · «Fuera de la batería» · «La roca o el fluido, no un equipo» |
| ⓘ del paso | «Dónde empezó lo que paró el pozo, no dónde está el pozo: si la planta no recibe y el pozo cierra, se trabó en la planta. Es el paso 2 de la Circular 024 de la ANH ("componente del sistema de producción").» + enlace «¿Qué método es?» al ⓘ de §1.3 |
| Botón para corregir (sup, prod, jefe, conf) | «Corregir dónde se trabó» |
| Pregunta al corregir una cascada | «¿Aplica a los {n} pozos de esta parada?» → «Sí, a los {n}» · «Solo a {pozo}» |
| Motivo obligatorio si ya estaba confirmada | «¿Por qué lo cambia?» con atajos «El equipo es de otro pozo» · «La raíz fue otra» · «El oleoducto sí recibía» · «El oleoducto no recibía» · «Otra razón: [____]» |
| Opción «En el yacimiento» para `sup` y `jefe` | No sale. En su lugar: «¿Fue el yacimiento? Pedir a producción» |
| Evidencia obligatoria al escoger «En el yacimiento» (prod, conf) | «¿Qué lo muestra?» → «La prueba del pozo» · «El corte de agua subió» · «La presión de fondo cayó» · «Otra: [____]» |
| Aviso cuando cambia el paso 1 | «Cambió quién: ahora es Externo · Transportador. ¿Cambiamos también dónde se trabó a "Afuera"?» → «Sí» · «No, dejar como estaba» |

**La tubería del campo (Producción y Planta):**

| Elemento | Texto exacto |
|---|---|
| Título del panel | «LA TUBERÍA DEL CAMPO» · a la derecha: «qué limita hoy al campo» |
| Línea de lectura (Lectura, «¿cómo se lee?») | «Cada tramo es tan alto como lo que puede dejar pasar por día. El más angosto dice "limita": ese es el tope del campo hoy. Lo oscuro es lo que pasa ahora; lo claro, lo que cabría. Debajo de cada tramo, lo que se perdió ahí en el período. Gris es normal: el color solo sale en un equipo con alarma.» |
| Marca del tramo que limita | «◄ limita» |
| ⓘ de «limita» | «El tramo más angosto. No es una alarma: todo campo tiene uno. TRIM lo calcula con las pruebas de los pozos y las capacidades firmadas; nadie lo escribe a mano.» |
| Frase de abajo cuando limitan los pozos | «A la planta le sobran {h} bbl/d: lo que den de más los pozos pasa, hasta {h} bbl/d.» |
| Frase cuando limita la planta | «A los pozos les sobran {h} bbl/d: abrir más pozos no da nada. Lo que da es ampliar {el tren de crudo / el agua / el gas}.» |
| Frase cuando limita afuera | «Afuera no reciben más: a los pozos les sobran {h} bbl/d. Lo que da es más nominación o más evacuación.» |
| Casi iguales | «{Tramo A} y {tramo B} están casi iguales (menos de {u} % de diferencia): lo que se gane en uno lo frena el otro.» |
| ⓘ de «le sobran» | «Cuánto más podría pasar este tramo antes de volverse el más angosto.» |
| ⓘ del yacimiento | «El yacimiento no tiene un número propio: lo que puede dar se mide con las pruebas de los pozos. Aquí solo se cuenta lo que se perdió por causas del yacimiento.» |
| ⓘ de «sin identificar» | «Paradas que todavía no tienen causa: hasta que alguien diga qué pasó, no se sabe dónde se trabó. No se reparten entre los tramos.» |

**Estados vacíos y «sin dato»:**

| Situación | Texto exacto |
|---|---|
| Campo sin esquema de planta | «{Campo} no tiene esquema de planta registrado: sin él no se sabe qué limita.» + «Configurar» (solo `adm`) |
| Falta una capacidad firmada | Tramo en gris discontinuo con «sin firmar». Debajo: «No se puede decir qué limita: falta la capacidad de {la planta / afuera}. La firma el administrador.» |
| Capacidad del demo, sin firma | «{n} bbl/d · dato del demo, sin firmar» |
| Gas sin medir | Subtramo en gris discontinuo: «gas · sin medir». ⓘ: «El gas no se mide en esta fase: no se puede saber si el tren de gas es el más angosto.» |
| Campo de gas (La Zarza) | «La Zarza es un campo de gas. La tubería del gas todavía no está: el gas tiene "una tolerancia diferente" (Edinson) y falta definir cómo se mide su potencial.» |
| Pozos sin prueba | «{n} pozo(s) sin prueba no entran en lo que pueden dar los pozos.» (La Zarza tiene 1 [demo]) |
| Nada se perdió en el período | «Nada se trabó en {período}.» |
| Hay paradas sin causa | Bloque gris discontinuo: «sin identificar · {n} bbl · {pozos}» + «Identificar» |
| Empate exacto | «Dos tramos dan exactamente lo mismo: {A} y {B}. Producción tiene que explicar por qué (lo pide el método).» + «Explicar» (solo `prod`) |
| Prueba vieja en el potencial de los pozos | Reloj gris, la marca de `medicion-campana` (U1 §9.2): «la prueba más vieja es de hace {n} días» |
| Sin comunicación con el medidor de un caudal | Morado con círculo punteado (U1 §9.2): «Sin comunicación desde {hora}». El caudal pasa a «---» |

**Avisos:**

| Aviso | Texto exacto | A quién |
|---|---|---|
| Cambió lo que limita | «Cambió lo que limita en {campo}: desde el {fecha} limita {tramo nuevo} ({n} bbl/d); antes, {tramo anterior}. Cambian los equipos que más cuestan si fallan: revise "Si falla hoy".» | `prod` y `conf`, en pantalla y por correo. No va por WhatsApp porque no pide nada urgente |
| Un equipo sube en «Si falla hoy» por otro que paró | «{Equipo} sube al puesto {n} porque {otro} está parada: si {equipo} falla ahora, el campo pierde {x} bbl/d con {colchón} de colchón.» | `conf` y `jefe`, en pantalla; en la ficha del equipo |
| Trabajo programado sobre un equipo que hoy vale más | «Ojo: {equipo} vale más mientras {otro} esté parada. ¿Mover el trabajo?» | `jefe` y `plan`, en el programa |

## §2 «La tubería del campo»

### 2.1 Qué responde, y cómo se lee en 10 segundos

Responde a una pregunta: **«¿Dónde está hoy el tope del campo, cuánto está pasando y qué se perdió en cada tramo?»**

Se lee en tres miradas, de izquierda a derecha:
1. **El tramo más angosto dice «limita».** Ese es el tope de hoy.
2. **Lo oscuro es lo que pasa ahora.** Es el mismo nivel en los tres tramos, porque la producción pasa por todos. Lo claro de encima es lo que cabría.
3. **Debajo de cada tramo va lo que se perdió ahí.** Arriba, «perdiéndose ahora»; abajo, «se trabó en {período}».

### 2.2 Los números del dibujo, con La Ceiba de hoy

| Tramo | Lo que puede dejar pasar (bbl/d de crudo) | De dónde sale | Le sobran | Perdiéndose ahora | Se trabó en octubre (1–2 oct) |
|---|---|---|---|---|---|
| Yacimiento | sin número propio: va con los pozos (ⓘ) | — | — | 0 | 0 |
| Pozos (18) | **11.360 ◄ limita** | Σ prueba vigente × factor de asignación 0,96 (`estadoCampo.potencialBpd`) [demo] | — | 0 | 118 · LC-05, baja tensión (propuesta, §4.4) [cálculo U2] |
| Planta o estación | **12.000** · el menor de sus trenes: crudo 12.000 · agua 267.750 bbl/d de agua ≈ 13.574 de crudo · gas sin medir | Crudo y agua: `crudoCap` y `aguaCap` de `planta.ts` [demo]. Agua pasada a crudo con el corte de las pruebas (95,2 %) [cálculo U2]. Gas: capacidad declarada 4.200, caudal no medido («El gas no se mide en esta fase», `Planta.tsx`). El motor en construcción sí lo mete, con la relación del esquema, y da 11.400 (§11.3, punto 1) | 640 [cálculo U2] | **1.665** · ◆1 P-201B parada desde 03:52 · LC-07 y LC-16 cerrados [demo] | 573 · P-201B [demo] |
| Afuera | **14.000** · oleoducto; cliente 15.000 | `chokes.evacuacion` y `chokes.mercado` de `planta.ts`. Dato del demo, sin firmar [demo] | 2.640 [cálculo U2] | 0 | 0 |
| ┄ Sin identificar | — | — | — | **301** · LC-21, cerró el 1-oct a las 18:20 (código CMD) [demo] | 355 · LC-21 247 · LC-08 109 [demo] |
| **Total** | **Pasa hoy: 9.394** (`caudalesAhora`) [demo] | | | **1.966** [demo] | **1.046** [demo] |

Se cumplen dos cuadres:
- **lo que deja pasar el tramo que limita − lo que pasa hoy = perdiéndose ahora**: aquí limitan los pozos, y 11.360 − 9.394 = 1.966;
- **el reparto por tramo suma el diferido del libro**: 573 + 118 + 355 = 1.046.

Son la identidad de CHOKE-COMPLETO §6, aplicada a «ahora» y al período.

**Lo que esto le dice a producción** (texto de la frase de abajo, §1.5):
- «A la planta le sobran 640 bbl/d: lo que den de más los pozos pasa, hasta 640 bbl/d.»
- En La Ceiba, hoy un trabajo de pozo **sí** da barriles.
- En marzo la frase era la contraria [cálculo U2, §7.1]: limitaba el tren de crudo, con 12.000 contra 12.553 de los pozos. Decía: «A los pozos les sobran 553 bbl/d: abrir más pozos no da nada. Lo que da es ampliar el tren de crudo».

### 2.3 Anatomía del dibujo

**Forma general.**
- Es una tubería horizontal de cuatro tramos, de izquierda a derecha: yacimiento → pozos → planta o estación → afuera. Va en el mismo sentido que el esquema de `Planta.tsx`.
- El yacimiento no tiene alto: es la fuente, una zona sombreada sin contorno, con su ⓘ.
- Al final va una flecha: «venta».

**El alto de cada tramo (el «ancho» del tubo) es proporcional a lo que puede dejar pasar.**
- El eje empieza en cero. Nunca se corta el eje para «exagerar» el angostamiento.
- En el demo las diferencias son chicas: los pozos, 81 % de afuera; la planta, 86 %. A simple vista se notan poco, y eso es la verdad.
- Por eso **mandan la palabra «limita» y el número**: el dibujo acompaña.
- Una escala que exagerara la diferencia mentiría: un tramo con 5 % de diferencia parecería la mitad.

**El relleno.**
- La parte oscura de cada tramo es **lo que pasa hoy** (9.394 bbl/d). Su borde de arriba es una línea recta que atraviesa los tres tramos.
- La parte clara de encima es lo que cabría.
- El tramo que limita es el que tiene menos parte clara.
- Colores: el oscuro es `--dato-2` y el claro, `--panel2`. Los dos son tokens de la rampa de grises de `index.css`, en claro y en oscuro.

**Las marcas, cada una con forma y texto.**

| Marca | Forma | Texto | Color |
|---|---|---|---|
| Limita | Contorno de doble grosor y triángulo ◄ debajo | «◄ limita» | Tinta (gris oscuro). **Nunca** rojo ni naranja |
| Casi iguales | Contorno de doble grosor **discontinuo** en los dos tramos | «casi iguales» y la diferencia en % | Tinta |
| Sin dato o sin firmar | Contorno gris discontinuo y relleno vacío | «sin medir», «sin firmar», «sin dato» | `--tinta3` (lo de «falta» de U1 §2.1) |
| Equipo en alarma dentro de un tramo | La marca del equipo con su forma, por ejemplo el rombo con «1» | «P-201B parada · 2 pozos» | El de la paleta vigente (U1 §9.2): desde F2, naranja para la prioridad 1 y rojo solo con candado de interlock |
| Lo que queda hoy por un equipo parado | Línea gris discontinua por dentro del subtramo | «hoy, sin P-201B: 178.500 de 267.750 bbl/d de agua» | Gris |
| Sin comunicación con el medidor de un caudal | Círculo punteado | «Sin comunicación desde {hora}», y el caudal pasa a «---» | Morado (U1 §9.2) |

Si el tramo que limita tiene un dato sin firmar, **conserva el doble contorno** de «limita». La advertencia va en su número: «sin firmar», en gris y con subrayado discontinuo. Las dos cosas son ciertas a la vez y ninguna tapa a la otra.

Una línea gris discontinua por dentro marca **lo que queda hoy** cuando hay un equipo parado. El tramo **no** se angosta por una parada: su alto sigue siendo la capacidad instalada. Así lo pide el método: «Plant potential should not be reduced for planned or unplanned shut-downs» (NSTA p. 29, vía CHOKE-COMPLETO §3). La parada es pérdida, no menos capacidad. La línea de dentro solo muestra cuánto queda mientras dura.

**La planta por dentro.**
- En escritorio, el tramo de la planta se parte en tres carriles finos, uno por tren: crudo, agua y gas. Son las bandas que ya usa el esquema de Planta («TREN DE CRUDO», «TREN DE AGUA», «TREN DE GAS»).
- Cada carril dice su capacidad en crudo y, entre paréntesis, en su propia unidad: «agua ≈ 13.574 (267.750 bbl/d de agua)».
- El carril que manda dentro de la planta lleva «el menor».
- Si la planta es el tramo que limita, ese carril se lleva también el «◄ limita».
- En el teléfono, los carriles son tres renglones.

**Afuera.** Lleva su capacidad y, al abrirlo, los subniveles de §1.1. Si el dato es del demo o no está firmado, va en gris discontinuo con «sin firmar».

**«Sin identificar».**
- Se llama igual que en Identificar y en el Resumen («sin identificar 355 bbl»; `TIPO_CAUSA.pendiente`). Es una palabra por idea, y el número es el mismo.
- Es un bloque aparte, a la derecha de la tubería, gris y discontinuo, con el botón «Identificar».
- No es un tramo, porque no es un lugar: es lo que todavía no se sabe.
- Nunca se reparte entre los cuatro tramos (§0, principio 5).

### 2.4 Dónde vive

| Pantalla | Quién | Qué versión |
|---|---|---|
| **Producción** (`Produccion.tsx`), nuevo panel entre el bloque de arriba y «DÍA A DÍA» | `prod` (nivel ingeniería) | Completa |
| **Planta** (`Planta.tsx`), nuevo panel arriba de «ESQUEMA DE PLANTA» | `prod`, `conf`, `adm` | Completa. Es el mismo componente: `conf` y `adm` no tienen la pantalla Producción (`roles.ts`) |
| **Producción**, con todos los campos | `prod` | Una fila por campo: «La Ceiba · limitan los pozos · a la planta le sobran 640» |
| **Turno** (`Turno.tsx`), una línea en el bloque de arriba | `sup` | Solo texto: «Qué limita hoy: los pozos (11.360 bbl/d)», más «Perdiéndose ahora», que ya existe |
| Resumen del gerente | `ger` | **No ve la tubería.** Ve «dónde se trabó» por campo (§3, §9.2) |

El esquema de planta sigue siendo el dibujo de los equipos. La tubería es su resumen en cuatro tramos. Los dos se enlazan:
- tocar el tramo de la planta en la tubería ubica la banda del tren en el esquema, con el botón de mira ⌖ que ya existe;
- desde el esquema, «Ver la tubería» sube al panel.

### 2.5 Escritorio

Ancho completo del panel, con unos 900 px para el dibujo. Hay tres filas de texto debajo del dibujo:
1. la frase de lo que limita;
2. «Perdiéndose ahora», con los equipos y sus marcas;
3. «Se trabó en {período}», por tramo, con el botón «Ver por dónde se trabó». Ese botón lleva a Diferidos con la vista por tramo.

Boceto en §9.1.

### 2.6 Teléfono

En el teléfono (unos 38 caracteres), la tubería se pone **de pie**:
- los tramos van uno debajo del otro, de arriba hacia abajo, en el mismo orden;
- cada tramo es una barra horizontal cuyo **largo** es proporcional a lo que puede dejar pasar;
- el relleno oscuro es lo que pasa hoy;
- el tramo que limita lleva «◄ limita» al final de su barra.

Así cabe sin desplazarse de lado. Es la regla del teléfono de `Planta.tsx` («En el teléfono el dibujo no se lee: primero las listas»), pero aquí el dibujo sí se lee, porque son cuatro barras. Debajo van las tres filas de texto. Boceto en §9.1.

### 2.7 Impresión en PDF

- La tubería sale en el informe que arma «Exportar», con folio y huella (`informe.ts`), en **escala de grises**.
- Todo lo que significa algo tiene forma y texto: doble contorno, «◄ limita», discontinuo para «sin dato» y la marca del equipo con su número. Una copia en blanco y negro se lee igual (U1 §9.3).
- Debajo del dibujo se imprime **una tabla con los mismos números** (la de §2.2), como hacen hoy Planta con su leyenda y Producción con su cuadre.
- El membrete dice el campo, el período, «potenciales con las pruebas al {fecha}» y «capacidades firmadas el {fecha} por {persona}». Si no hay firma, dice «capacidades del demo, sin firmar».
- El bloque no se parte entre dos hojas.

### 2.8 Accesibilidad

- **Lector de pantalla:** el SVG es `role="group"` y su `aria-label` resume todo en una frase. Por ejemplo: «Tubería de La Ceiba. Limitan los pozos: 11.360 barriles por día. Planta: 12.000, le sobran 640. Afuera: 14.000. Pasa hoy: 9.394. Perdiéndose ahora: 1.966, de ellos 1.665 en la planta por P-201B parada y 301 sin identificar, LC-21.»
- **Teclado:** cada tramo recibe el foco con Tab; las flechas pasan de un tramo a otro y Enter abre su detalle, igual que «Día a día» de Producción.
- **Tabla equivalente:** el botón «Ver como tabla» muestra la tabla de §2.2. Es la misma que se imprime.
- **Sin depender del color:** ninguna marca es solo color (§2.3). Se prueba con simulación de daltonismo y en blanco y negro (§10).
- **Contraste:** solo tokens de `index.css`, que `verificar-libro.mjs` ya revisa con WCAG (U1 §9.4).
- **Letra:** nada por debajo de 12 px en el dibujo. Es la misma regla de `ESCALA_MINIMA` del esquema: «por debajo, la letra no se lee».
- **Movimiento:** nada se anima ni parpadea (U1 §9.3).
- **Tema oscuro:** los mismos tokens, que ya tienen su valor en oscuro.

### 2.9 Qué muestra hoy cada campo del demo

| Campo | Qué limita hoy | Le sobra al siguiente tramo | Nota de pantalla |
|---|---|---|---|
| La Ceiba | Pozos, 11.360 | Planta (tren de crudo), 640, o 5,6 % | P-201B parada: «hoy, sin P-201B: 178.500 de 267.750 bbl/d de agua». Gas sin medir |
| Morichal Norte | Pozos, 17.604 | Planta (agua), 716, o 4,1 %: «al agua le falta poco para ser lo que limita» | El tren de agua va al 92,4 % ahora [cálculo U2] |
| Guacamayo | Pozos, 6.615 | Afuera, 885, o 13,4 % (ya no «casi iguales») | Afuera, 7.500, es la «nominación restringida» del oleoducto (`planta.ts`). El crudo de la planta es 8.000: hasta el 22-oct los dos estaban en 7.500, un empate artificial que el método pide explicar (NSTA §5.4) |
| El Palmar | Pozos, 3.277 | Planta (tren de crudo), 323, o 9,9 % | Sin tren de gas |
| La Zarza | — | — | Estado vacío de campo de gas (§1.5) |

Fuente: [cálculo U2] con `crudoAsignado`, `aguaDePrueba` y las capacidades de `planta.ts`.

**El valor que el demo declara a mano en `Campo.choke` no coincide con el calculado en dos campos:**
- La Ceiba declara «Planta» y el cálculo da los pozos.
- El Palmar declara «Planta» con 3.295 y el cálculo da los pozos (3.277), con el tren de crudo en 3.600.

Es justo lo que CHOKE-COMPLETO §3 y §4 quieren evitar al pedir que **se calcule y no se declare**. La pantalla lee el calculado (§12, punto 13).

## §3 Por rol

Los ids son los de `src/entities/roles.ts`. Como en U1 §1.0, **el rol es una lente, no un permiso**. Lo que cada uno puede escribir lo dicen las capacidades (`causa:declarar`, `causa:completar`, `config:firmar` y las nuevas de P1 §1.15). Las pantallas son las que cada rol tiene hoy en `roles.ts`. `plan`, `cont` y `reg` están apagados en el MVP (`producto.ts`).

### 3.1 La tabla

| Rol | Qué ve del modelo | Dónde (pantalla existente o nueva) | Qué NO ve | Pregunta que le responde | Qué puede hacer |
|---|---|---|---|---|---|
| **ger** · Gerente de activo | **En qué tramo se trabó cada campo en el período**, en barriles, con una frase y los equipos que más pesaron. La **pérdida** va en su línea aparte. Desde F3, una línea opcional: «Para producir más en {campo} hay que ampliar {tramo}» | **Resumen** › POR CAMPO (`PorCampo.tsx`): una barra «dónde se trabó» por campo (§9.2) · **Diferidos**: la vista «Por dónde se trabó» | La tubería, los potenciales, las holguras, los carriles de la planta, «Si falla hoy» como lista (ya ve los equipos en riesgo en Riesgo), los códigos (`PLANTA`, `NP_PROC`), N1, N2 y la palabra «choke» | «¿En qué tramo se me trabó cada campo este mes, y con qué equipos?» | Nada nuevo: solo mira. Puede exportar con folio, como hoy |
| **prod** · Ingeniera de producción | **La tubería completa**: qué limita hoy, potenciales con su fuente, holguras, planta por dentro, perdiéndose ahora y lo perdido por tramo. **La tubería del agua.** La serie de lo que limita y su aviso | **Producción** y **Planta**: panel «LA TUBERÍA DEL CAMPO» (§2.4) · **Agua** (se enciende, §5.6) · **Diferidos**: «Por dónde se trabó» · **Identificar** | Detalle de mantenimiento (órdenes, repuestos), como en U1 §1.1 | «¿Qué limita hoy al campo, y un barril más de pozo pasa o se frena?» | Confirmar o corregir el paso 2. Es la única, con `conf`, que puede poner **«En el yacimiento»** (§4.3). Explicar un empate exacto |
| **sup** · Supervisor de operaciones | **Una línea** con lo que limita hoy; «Perdiéndose ahora» con su tramo; en la ficha de la bomba, el colchón y el orden de cierre; la cadena de cada parada para confirmar en lote | **Turno**: línea nueva en el bloque de arriba y un chip «en la planta» o «en el pozo» en «Pasando ahora» · **Bombas**: ficha de la bomba con la tubería del agua en corto (§9.6) · **Identificar**: «CIERRE DE HOY» en grupos | Potenciales, carriles, serie, «Si falla hoy» como lista, la palabra «choke» y «yacimiento» como opción | «¿Qué está frenando el campo ahora, y en qué orden cierro si se llena el tanque?» | Confirmar la cadena (1 toque, o 2 por grupo) y corregir el paso 2 con motivo. **No** pone «En el yacimiento»: lo pide a producción |
| **oper** · Operador de campo | **Nada del modelo.** Contesta lo que vio: «¿De dónde vino el corte?», «¿El oleoducto o el cliente estaba recibiendo?», «¿Qué encontró?» | **Identificar** en el teléfono y WhatsApp, como en U1 §2.4 y §2.6 | **Nunca** se le pide escoger el tramo. La cadena técnica va plegada, con la línea «lo propone TRIM; lo confirma su supervisor» (U1 §10.1) | «¿Qué me falta contestar ahora?» | Contestar las preguntas de campo. Su toque **no** sube el paso 2 a confirmado (P1 §1.3) |
| **jefe** · Jefe de mantenimiento | «Si falla hoy», con el tramo de cada equipo. En cada equipo, «Si para, se traba en…». El aviso de trabajos programados sobre equipos que hoy valen más | **Riesgo**: la columna «se trabaría en» y el enlace a «Si falla hoy» · **Confiabilidad**: panel «SI FALLA HOY» (§6) · **Superficie** (`Equipo.tsx`) · **Identificar** | La tubería completa (no tiene Producción ni Planta) y la serie de lo que limita | «¿Qué equipo me quita más barriles si falla hoy, y qué no debo intervenir mientras otro está parado?» | Confirmar o corregir el paso 2, porque abre el equipo. No pone «yacimiento» |
| **conf** · Ingeniero de confiabilidad | «Si falla hoy» completo, con «¿lo vigila TRIM?». La tubería y la del agua. **La calidad del paso 2**: cuántas propuestas corrige la gente y con qué regla. El rótulo «modelo choke» con su ⓘ | **Confiabilidad**: «SI FALLA HOY» y «CALIDAD DE DÓNDE SE TRABÓ» · **Planta** y **Agua** · **Identificar** | Dinero de detalle | «¿Dónde pongo el próximo instrumento y la próxima ruta para que una falla no me cueste el campo?» | Confirmar o corregir el paso 2 y poner «En el yacimiento» |
| **plan** · Planeadora (v2) | «Si falla hoy» con la columna «¿alcanza el repuesto?». El aviso de trabajos programados | **Superficie** y **Confiabilidad** | La tubería | «¿Qué programo y qué repuesto pido primero, según lo que más cuesta si falla?» | Solo mira (hoy no tiene capacidades de escritura en `roles.ts`) |
| **tec** · Técnico (v2 en lo del programa) | Nada del modelo. Su cierre de orden (la parte que encontró) alimenta la causa | **Mi trabajo** | El tramo, la tubería y el ranking | «¿Qué me toca hoy?» | Lo de U1 §8 |
| **cont** · Abastecimiento y contratos (v2) | Las paradas que se trabaron **afuera**, con quién no recibió y la línea de tiempo del PLC | **Evidencia** | Potenciales y tubería | «¿Esta parada fue del oleoducto o del cliente, y con qué prueba?» | Exportar evidencia |
| **reg** · Cumplimiento regulatorio (v2; P1 lo enciende con el carril ANH) | El `choke_mod` de cada fila, en la forma de salida configurada (`POZO` / `PLANTA` / `EXPORTACION` / `RESERVORIO`), y el cuadre: Σ por tramo del día = Σ de las filas. El rótulo «modelo choke» con su ⓘ | **Regulatorio** (U1 §6) | La tubería y «Si falla hoy» | «¿Cada fila lleva su tramo, y cuadra?» | Lo de U1 §6 |
| **adm** · Administrador | La topología («¿a qué pozos sirve este equipo?»), las capacidades de los tramos, la vista previa y la firma. La tubería, para revisar que quedó bien | **Configuración** › página nueva «Filosofía operacional» (§8) · **Planta** | Cifras de diferido de detalle (U1 §1.1) | «¿Está bien cargado cómo está armado el campo, y qué cambia si lo firmo?» | Preparar y firmar con `config:firmar`. Ver §12, punto 7 |

### 3.2 Lo que no se negocia en esta tabla

- **El gerente nunca ve detalle técnico** (regla del dueño, CONTEXTO): ni potenciales, ni carriles, ni códigos. Ve campo → tramo → equipo, en barriles.
- **Al operador nunca se le pide escoger el tramo.** Sus preguntas preguntan hechos («¿de dónde vino el corte?»), no clasificaciones. Lo prueba la tarea O-1 de §10.
- **«En el yacimiento» lo pone una persona de ingeniería** (prod o conf), con evidencia. TRIM nunca lo deduce de una señal (P1 §2.1).

### 3.3 En qué orden conviene entregar cada vista

La construcción del 21-oct (`CHOKE-CONSTRUCCION.md`) hace las piezas 1 a 11 de una vez. Si hubiera que escalonar la entrega a los usuarios, este es el orden que recomienda la experiencia. Sigue `CHOKE-COMPLETO.md` §15 y `PLAN-MAESTRO.md` §5. Las piezas se citan con el número de la tabla de CHOKE-COMPLETO §1. Su §15 numera de la 8 en adelante con el número de sección, que va uno más arriba (§12, punto 15).

| Fase | Lo que entra de este diseño |
|---|---|
| **F1** · arquitectura | Paso «¿Dónde se trabó?» en Identificar (pieza 4) · reparto por tramo para el gerente y Diferidos (pieza 5) · topología mínima en Configuración, porque sin ella el paso 2 cae a los valores por defecto (S1 §3, punto 2) · tubería con potenciales calculados y lo que limita (piezas 2 y 3), solo para `prod` |
| **F2** · piloto | Tubería del agua (pieza 8, CHOKE-COMPLETO §9) · «Si falla hoy» (pieza 9, §10) · marcas de alarma con la paleta de Adair |
| **F3** · escalar | Serie de lo que limita, aviso de cambio y «antes → con TRIM» por tramo (pieza 10, §11) · vistas completas por rol (pieza 11, §12) · capacidades de afuera firmadas · línea de desembotellamiento para el gerente (§10 de CHOKE-COMPLETO) |

## §4 El paso «¿Dónde se trabó?» en Identificar

### 4.1 Dónde va en la cadena

La cadena de U1 §2.1 no cambia de orden. Es el de la circular (C24 p. 5): **quién → dónde se trabó → qué pasó (diferida o pérdida) → ¿planeada? → causa (N1) → detalle (N2)**. Este documento diseña el eslabón 2.

```
1 Quién              Operador · Mantenimiento
2 ¿Dónde se trabó?   En la planta o estación     TRIM lo dedujo: porque P-201B saca el agua de los 18 pozos
3 Qué pasó           Diferida
4 ¿Planeada?         No planeada
5 Causa              No planeada - Proceso / Facilidades
6 Detalle            Parada estación/bombeo afecta pozos      (falta la parte de P-201B)
```

Es la cadena de **LC-16**, que cerró el 2-oct a las 05:43 por el tanque de agua lleno mientras P-201B estaba parada [demo]. Los pasos 5 y 6 siguen la regla híbrida de P1 §3.1: mientras no se sepa qué parte de la bomba falló, van a «Parada estación/bombeo afecta pozos».

Cambios frente a U1 §2.1:
- El rótulo lleva signos de pregunta, **«¿Dónde se trabó?»**, igual que «¿Planeada?».
- El porqué del eslabón 2 se escribe **siempre** con la palabra «porque» y el equipo y los pozos con su nombre. U1 decía «el equipo es solo de este pozo», sin nombres.

### 4.2 Cómo lo propone TRIM, con su porqué en una frase

La regla es la de P1 §2.1 (`choke.topologia@1`): **manda el origen**; lo dedicado a un pozo es del pozo y lo compartido es de la planta (criterio de Edinson, [26:48]).

La pantalla nunca muestra el nombre de la regla. Muestra la frase.

| Situación | Propone | Porqué (texto exacto, una frase) | Ejemplo del demo |
|---|---|---|---|
| Falla del levantamiento del pozo (código del variador GF, PH, OL u OT; bombeo mecánico) | En el pozo | «porque {equipo} es solo de {pozo}» → «porque la electrosumergible es solo de LC-11» | LC-11, código PH, 25-sep, 3.677 bbl [demo] |
| Bomba de la línea parada y pozo cerrado por el tanque de agua (LSHH) | En la planta o estación | «porque {pozo} cerró por el tanque de agua lleno mientras {bomba} estaba parada» | LC-16 y LC-07, 2-oct 05:43, con P-201B parada [demo] |
| Bomba de la línea sola (en la ficha de la bomba) | En la planta o estación | «porque {bomba} saca el agua de los {n} pozos» / «porque {bomba} mueve {pozos}» | P-201B: 18 pozos · MPP-301: MN-07, MN-18 y MN-33 [demo] |
| Cascada de un servicio | En la planta o estación | «porque {pozo} cerró {m} min después de que cayó {servicio}, que {verbo} {n} pozos» → «…que le da aire a todo el campo» / «…que alimenta los 41 pozos» | K-101, 28-ene-2026, 18 pozos, 3.910 bbl · SE-2 de Morichal, 18-may-2026, 41 pozos, 26.215 bbl [demo] |
| Baja tensión (UV) en **un solo** pozo | En el pozo, **como propuesta**, más la pregunta «¿De dónde vino el corte?» al operador | «porque solo cayó {pozo} de los {n} pozos que cuelgan de {alimentador}: si hubiera fallado {alimentador}, habrían caído todos» | LC-05, 1-oct 09:16, 118 bbl, colgado de SE-2 con otros 17 pozos [demo]. **Regla nueva**: §4.4, caso 8 |
| Tanque de crudo alto (alarma de nivel) | En la planta o estación, **como propuesta**, más la pregunta «¿El oleoducto o el cliente estaba recibiendo?». Si contesta «No, no recibía», pasa a Afuera | Antes de la respuesta: «porque el tanque de crudo se llenó (LAH-3011); la nota del evento dice "despacho limitado por la nominación del oleoducto": falta que alguien diga si el oleoducto recibía». Después: «porque {persona} dijo que el oleoducto no recibía» | Guacamayo, LACT-01, desde el 16-oct-2025: 29 tramos de frecuencia bajada, 15.179 bbl en 12 meses [demo] |
| Programa firmado | El tramo del equipo intervenido | «porque estaba en el programa firmado: {motivo}» | P-201B, 19-ago-2026, «Mantenimiento preventivo programado de la bomba», 3 pozos, 1.523 bbl → planta · MN-16 y MN-05, «Orden predictiva: el vigía anticipó la falla…» → pozo [demo] |
| Declarada con uno de los 4 botones de `CAUSAS_POZO` | El tramo que dice el botón | «porque {persona} dijo: "{texto}"» | MN-22: «Fuga en la línea de flujo del pozo» → pozo, porque la línea es solo suya · ZA-06: «El comprador nominó menos gas» → afuera [demo] |
| Ninguna regla aplica: equipo sin topología | Nada: el eslabón queda «falta» | «Falta saber a qué pozos sirve {equipo}» + «Configurarlo» (solo `adm`) o «Escoger» (sup, prod, jefe, conf) | (ejemplo) |
| Sin causa (`pendiente`) | Nada: el eslabón queda «falta» | «Hasta que alguien diga qué pasó, no se sabe dónde se trabó» | LC-21, 1-oct 18:20, CMD; LC-08, 1-oct 22:15, CMD [demo] |

Lo que **nunca** se propone desde una señal es **«En el yacimiento»** (P1 §2.1). Si una electrosumergible para por **baja carga (UL)**, las señales pueden apuntar a que al pozo le falta aporte. En ese caso, a `prod` y `conf` (no al operador) les sale debajo de la cadena:

> «Las señales apuntan a que al pozo le faltó aporte (baja carga). ¿Fue el yacimiento?» → «Sí, fue el yacimiento» · «No, fue la bomba»

Es la fila de admisión de P1 §2.1. En septiembre, en La Ceiba, hubo 7 paradas por baja carga en 6 pozos (LC-16 dos veces, LC-08, LC-09, LC-14, LC-02 y LC-12) [demo]. Es la pregunta que más se va a ver.

### 4.3 Quién lo confirma, cómo y con cuántos toques

Confirman `sup`, `prod`, `jefe` y `conf`: su toque sube los seis pasos a «confirmado» (`PASOS_QUE_CONFIRMA`, P1 §1.3). El toque del operador o del técnico **no** sube el paso 2. El paso sigue como propuesta de TRIM (origen `C`) hasta que pasa uno de los cuatro.

| Acción | Quién | Toques | Qué ve después |
|---|---|---|---|
| Confirmar la cadena propuesta de una parada | sup, prod, jefe, conf | **1**: «Confirmar» | «confirmó Nelson Ortiz · 14:05» en cada eslabón |
| Confirmar un grupo de cadenas iguales (fin de turno) | sup, prod (`anh:confirmar`) | **2**: abrir el grupo y «Confirmar las {n}» | Igual, con la marca de lote (`ConfirmacionLote`) |
| Confirmar una cascada (41 pozos, una raíz) | sup, prod | **1**: una sola cadena para los 41 | «41 paradas · una sola raíz: SE-2» |
| Corregir el paso 2 todavía no confirmado | sup, prod, jefe, conf | **3**: «Corregir dónde se trabó» → opción → «Guardar» | «corrigió {persona} · {hora} · antes: En la planta o estación» |
| Corregir el paso 2 ya confirmado | sup, prod, jefe, conf | **3 + motivo**: un atajo (1 toque) o texto | Igual, con el motivo. Queda la versión anterior al lado (U1 §2.7) |
| Aplicar la corrección a toda la cascada | quien corrige | **+1**: «Sí, a los {n}» | Las {n} filas cambian juntas (Unicidad, C24 p. 5) |
| Poner «En el yacimiento» | **solo prod y conf** | **4**: «Corregir dónde se trabó» → «En el yacimiento» → «¿Qué lo muestra?» (atajo) → «Guardar» | «lo puso Marcela Ríos · {hora} · la prueba del pozo» |
| Pedir el yacimiento a producción | sup, jefe | **2**: «Corregir dónde se trabó» → «¿Fue el yacimiento? Pedir a producción» | La parada pasa a «REVISAR» de producción (U1 §2.7) |
| Contestar «¿De dónde vino el corte?» | oper, tec | **1** (más «Confirmar lo que contesté») | «El resto lo revisa su supervisor» (U1 §2.4) |

Cuando la corrección de otro paso cambia la propuesta del paso 2, TRIM pregunta y nunca cambia solo. Por ejemplo, si el responsable pasa a «Externo · Transportador», sale: «¿Cambiamos también dónde se trabó a "Afuera"?» (§1.5).

**Por qué «En el yacimiento» es solo de producción y confiabilidad:**
- Necesita una prueba de pozo, el corte de agua o la presión de fondo, y eso no se ve desde el campo.
- Es el único tramo que nunca sale de una señal.
- P1 §1.3 da los seis pasos también a `sup` y `jefe`. Esta restricción es un pedido nuevo: §11 y §12, punto 8.

### 4.4 Los casos difíciles

**Caso 1. Cascada: muchos pozos, una sola raíz.**
- **Ejemplo real.** El 18-may-2026 cayó SE-2 en Morichal y cerraron los 41 pozos: 26.215 bbl. Es la segunda parada más cara de los 12 meses del demo. La primera es una sola electrosumergible, la de LC-16 en febrero, con 29.722 bbl [demo].
- **Qué ve el supervisor.** Una tarjeta, no 41: «41 pozos · una sola raíz: SE-2, el pórtico de 13,8 kV · En la planta o estación · porque SE-2 alimenta los 41 pozos».
- **Toques:** uno solo. Para la ANH son 41 filas (Unicidad, C24 p. 5).
- **Pozos que ya estaban parados** por otra causa: van en un renglón aparte, «ya estaba parado: no suma», y quedan como contribuyentes en la evidencia (CHOKE-COMPLETO §5, punto 4).

**Caso 2. Dos raíces casi al mismo tiempo.**
- **Ejemplo real.** El 25-mar-2026, P-201B paró a las 04:30 por el sello, y 49 minutos después cayó K-101, el aire de instrumentos. Tres pozos los cerró la bomba (2.875 bbl) y 15 los cerró el aire (4.278 bbl) [demo; el caso está escrito en `verificar-libro.mjs`].
- **Qué ve.** Dos grupos, cada uno con su raíz y su hora, sobre una línea de tiempo corta: «04:30 P-201B → 3 pozos» y «+49 min K-101 → 15 pozos». Los dos dicen «En la planta o estación».
- **Por qué importa:** si el supervisor confirma en lote sin ver la línea de tiempo, los 18 pozos quedarían cargados a una sola raíz.

**Caso 3. Tanques llenos: el agua no es el crudo.**
- **Tanque de agua lleno.** La planta no recibe: **en la planta**. Ejemplo: LC-16 el 2-oct, con P-201B parada [demo]. La pregunta de campo es «La planta no recibe (agua o proceso)» (U1 §2.4).
- **Tanque de crudo lleno.** TRIM propone la planta y hace una pregunta antes de que la cadena se pueda confirmar. Es la regla de P1 §3.3 y de S1 U1-1:
  > «¿El oleoducto o el cliente estaba recibiendo?» → «Sí, recibía» (**en la planta**: fue capacidad propia) · «No, no recibía» (**afuera**) · «No sé» (eslabón en «falta»).
- **Ejemplo real.** En Guacamayo, la alarma es la de nivel del tanque (LAH-3011) y la nota del evento dice «despacho limitado por la nominación del oleoducto» [demo].
  - TRIM propone «En la planta o estación», como manda P1 §2.1 y como ya hace el motor en construcción (`chokeDeCausa`), y pone la nota al lado de la pregunta.
  - Si alguien contesta «No, no recibía», pasa a «Afuera».
  - La nota ayuda a contestar, pero no decide sola: una nota no es una señal.
- **Por qué:** el anexo de la C-003 pone «tanques llenos» en Exportación, pero el agua de disposición nunca sale de la batería (P1 §3.4). Los mismos «tanques llenos» pueden ir a dos tramos distintos, y solo una persona sabe si el oleoducto recibía.

**Caso 4. Parada parcial (frecuencia bajada).**
- **La regla:** la fila dice «parcial: {x} de {y} Hz» y el tramo **sigue el origen**, no el pozo.
- **Ejemplos del demo** [demo]:
  - Morichal, 32 tramos de frecuencia bajada por el compresor C-401 (2.722 bbl): **en la planta o estación**.
  - Guacamayo, 29 tramos por la nominación del oleoducto (15.179 bbl): **afuera**, si se confirma.
  - Una electrosumergible a la que se le baja la frecuencia por un problema suyo: **en el pozo** (ejemplo).
- **Qué ve.** Un chip gris «parcial» y la fracción. Cómo quiere la ANH la parcial es **NO VERIFICADO** (P1, pregunta 8; R1 A-10).

**Caso 5. La causa cambia y la parada se parte en dos.**
- **Ejemplo.** P-201B arranca a las 18:00, pero LC-16 no vuelve porque su electrosumergible falla al arrancar (ejemplo).
- **Qué ve.** Una sola tarjeta con dos tramos sobre la línea de tiempo: «05:43–18:00 · En la planta o estación (P-201B)» y «18:00–… · En el pozo (electrosumergible de LC-16)». Arriba: «Se partió en dos a las 18:00: la causa cambió».
- **Toques.** Cada tramo se confirma por separado (2 toques), porque son dos decisiones.
- Que la ANH acepte dos filas seguidas con `h_fin_paro` = `h_ini_paro` es **NO VERIFICADO** (CHOKE-COMPLETO §16).

**Caso 6. Una parada planeada que se pasa de su ventana.**
- **El tramo no cambia:** sigue siendo el del equipo intervenido. Lo que cambia son los pasos 4 a 6.
- **Qué ve.** Dos tramos, como en U1 §2.5, punto 3: «dentro de la ventana · Planeada» y «se pasó de la ventana · No planeada · falta la causa».
- **Ejemplo real.** El preventivo de P-201B del 19-ago-2026 duró 13,2 h [demo]. Si su ventana hubiera sido de 8 h, las 5,2 h de más serían el segundo tramo (ejemplo).
- **NO VERIFICADO** con la ANH (CHOKE-COMPLETO §7).

**Caso 7. El yacimiento.**
- Solo lo pone una persona de ingeniería, con evidencia (§4.3).
- La tarjeta muestra «En el yacimiento · lo puso {persona}: {evidencia}».
- **Ejemplo** (ejemplo): la P-201B de Guacamayo, que es de recobro, queda parada tres semanas y el corte de agua de dos pozos sube. Producción pone «En el yacimiento» en las paradas que siguen, con «el corte de agua subió».
- TRIM nunca lo deduce: el motor dice que el efecto de no inyectar «llega en semanas» (`prediccion`, papel `recobro`) [demo].

**Caso 8. Baja tensión en un solo pozo: ¿pórtico o pozo?**
- **Hallazgo.** El demo carga cada baja tensión de un pozo a su **alimentador**: «Baja tensión en el alimentador del pozo» (`causa-senal.ts:306`). En La Ceiba y Morichal, el alimentador de todos los pozos es SE-2.
- **Qué pasa con la regla de topología de P1 §2.1.** Busca el `ChokeDeElemento` del alimentador. Como SE-2 es compartido, una baja tensión que tumbó **un solo** pozo quedaría «en la planta». Pero si el pórtico hubiera fallado, habrían caído todos sus pozos, como en las seis caídas de SE-2 en Morichal (36 o 41 pozos cada una) [demo].
- **Propuesta:**
  - si cae **un solo** pozo de los que cuelgan del alimentador, TRIM propone **«En el pozo»** y le hace al operador la pregunta de energía de U1 §2.4: «¿De dónde vino el corte?»;
  - si caen **varios** a la vez, dentro de la ventana de cascada de 15 minutos de `causa-senal.ts`, propone **«En la planta o estación»**.
- **Cuánto pesa.** En septiembre son 239 bbl de La Ceiba: LC-04 el 6-sep, LC-12 el 7-sep y LC-06 el 23-sep. En octubre, 118 bbl: LC-05 el 1-oct [demo].
- P1 se contradice aquí: su tabla `REGLAS_ANH` dice «`energia` por `UV` del pozo → pozo», y su regla de topología manda al alimentador. Ver §12, punto 5.

**Caso 9. Declarada con texto libre.**
- La topología queda como propuesta del eslabón 2, y los demás pasos se preguntan (P1 §2.1, última fila).
- La tarjeta dice: «Dónde se trabó: En el pozo · propuesta por la topología, revise».

### 4.5 Lo que ve el operador

Lo mismo que en U1 §10.1. La cadena técnica va plegada con la línea «lo propone TRIM; lo confirma su supervisor». Las preguntas de U1 §2.4 están hechas para que conteste un hecho, nunca una clasificación:
- **energía:** «Del campo: pórtico, red de media o subestación» frente a «De este pozo: su transformador, su variador o su cable»;
- **tanque de crudo:** «¿El oleoducto o el cliente estaba recibiendo?»;
- **clima y orden público:** «¿Qué se afectó?».

En ninguna pantalla ni mensaje del operador aparecen «¿Dónde se trabó?», «en la planta», «afuera» o «yacimiento» como opciones. Se prueba en §10, tarea O-1.

### 4.6 Para confiabilidad: la calidad del paso 2

Es un panel nuevo en Confiabilidad, «CALIDAD DE DÓNDE SE TRABÓ». Es la parte del eslabón 2 del tablero de calidad que P1 §2.1 llama «correcciones por regla».

| Cifra | Qué es | Para qué |
|---|---|---|
| % confirmado | Paradas del período con el paso 2 confirmado por sup, prod, jefe o conf | Saber cuánto miró una persona |
| % corregido | Paradas cuyo paso 2 cambió una persona (`propuesto` ≠ `valor`) | Saber cuánto se equivoca la regla |
| Correcciones por regla y por equipo | Por ejemplo, «baja tensión en un pozo: 7 de 9 corregidas a "En el pozo"» (ejemplo) | Ajustar la topología o la regla |
| Equipos sin topología | Equipos cuyas paradas quedaron en «falta» por no saber a qué pozos sirven | Mandárselos al administrador |

## §5 «La tubería del agua»

Es el «modelo choke de inyección» de CHOKE-COMPLETO §9 (pieza 8). SPE-36848 ya lo preveía: «a separate choke model can be used to model injection performance» (vía R2 §1.1). En pantalla no se llama así: se llama **«La tubería del agua»**.

### 5.1 Qué responde

**«¿Cuánta agua entra, cuánta puedo sacar, cuánto aguanta el tanque y qué pasa si para una bomba?»**

En campos con 92 % a 97 % de agua, esta tubería decide más paradas que la del crudo. Es la parte del choke que más toca el norte del plan: la bomba de reinyección.

### 5.2 Los tramos del agua, con La Ceiba

Va de izquierda a derecha, como la del campo: **agua de los pozos → tratamiento → tanque → bombas de reinyección → pozos inyectores**.

| Tramo | Qué se ve | La Ceiba | Fuente |
|---|---|---|---|
| **Agua de los pozos** | Lo que entra por día | **224.075 bbl/d** con los 18 pozos produciendo (corte 95,2 %) · **hoy 174.033** con 3 pozos parados (corte 94,9 %) | Σ agua de las pruebas vigentes (`aguaDePrueba`) [cálculo U2] · `caudalesAhora` [demo] |
| **Tratamiento de agua** | Capacidad | **sin dato**: el esquema de La Ceiba no tiene tratamiento de agua configurado (va del tanque a las bombas) | `planta.ts` [demo]. Tramo en gris discontinuo: «no está en el esquema» |
| **Tanque de agua** | Capacidad, alto-alto, nivel ahora | TK-AG-CE: **30.000 bbl** · alto-alto **90 %** · nivel **89,6 %** (LT-2012, 2-oct 13:59) | Configuración firmada y `NIVEL_AHORA` [demo] |
| **Bombas de reinyección** | Cuántas, cuánto da cada una, cuánto mueven | P-201A, P-201B y P-201C · **90.000 de placa** cada una (270.000 las tres) · P-201B mueve **74.200** (mediana de FI-2011) · si para una, las otras dos toman **30.100** más, hasta unos 89.250 cada una | `planta.ts`, `bombas.ts`, `configuracion.ts` (respaldo) [demo] |
| **Pozos inyectores** | Cuánta agua admiten | **267.750 bbl/d**: el cabezal de disposición deja a cada bomba en unos 89.250 (3 × 89.250) | `configuracion.ts`: «Lo que limita a las bombas es la presión del cabezal de disposición (la inyectividad de los pozos), no la placa de 90.000». Desde hoy también `TREN_AGUA.ceiba.admisionBpd` en `planta.ts`, que agregó la construcción del motor [demo]. **Es un dato del demo deducido de ese límite, no una medición**: la admisión real es un dato de la operadora (CHOKE-COMPLETO §16), y por eso lleva «sin firmar» |

**Qué limita el agua hoy: los inyectores (el cabezal de disposición), con 267.750 bbl/d, casi igual a las bombas (270.000 de placa).**
- Se marca con «◄ limita», igual que en el principio 4.
- Con P-201B parada, el que limita pasa a ser las bombas: «hoy, sin P-201B, caben 178.500 (P-201A y P-201C, unos 89.250 cada una)».

En Morichal, `TREN_AGUA` trae también la admisión (605.500 = 7 × 86.500). En Guacamayo, El Palmar y La Zarza, la admisión queda «sin dato», y el tratamiento de agua queda «sin dato» en todos los campos [demo].

### 5.3 El colchón, sin teoría

El panel dice tres frases. Son las tres cosas que un supervisor necesita saber:

> **Con las tres bombas, al agua le sobran 43.675 bbl/d.**
> **Si para una, faltan 44.100: el tanque se llena en {colchón} y hay que cerrar pozos.**
> **Cerrando primero los más acuatosos se pierden 1.426 bbl/d de crudo; cerrando parejo, 2.236.**

- 43.675 = 267.750 − 224.075 [cálculo U2]. 44.100 = los 74.200 que movía P-201B menos los 30.100 que toman sus hermanas (`aguaSinSalidaBpd`) [demo].
- El colchón depende del nivel del tanque cuando para la bomba. El 2-oct estaba al 78,7 %: el tanque aguantó **1,85 h**, y el motor había previsto **1,84 h** [demo, `paradaMedida`]. En las 10 paradas de P-201B del demo, el colchón previsto fue de **1,2 a 3,2 horas** [demo].
- «Los más acuatosos» es la palabra de Edinson: «hay que parar los pozos acuatosos, los pozos que más producen agua» [31:08]. TRIM ya los ordena (`ordenDeCierre`): primero LC-02, que da 30 bbl de crudo por cada 1.000 de agua; después LC-10 (34) y LC-01 (36); LC-17, al 25 %; y LC-07, al 12 % [demo]. El orden ahorra **810 bbl/d** [demo].

**Lo que pasó el 2-oct, contado en la misma pantalla** (línea de tiempo):

```
03:52  P-201B paró · tanque al 78,7 %
05:43  tanque lleno (1,85 h) · cerraron LC-16 y LC-07 · 1.665 bbl/d
14:00  P-201A y P-201C toman lo que entra (174.033 de 178.500): el nivel no sube
       «evitable cerrando en orden»: 30 bbl hasta ahora
```

Fuentes [demo]: evento `EV-2011-1002`, el «llenado» de la predicción («el respaldo toma el agua que entra, el nivel no sube», como ya lo dice Planta en la captura `prod-planta-ceiba.png`) y `evitable` de `paradaMedida`. Los 178.500 son 2 × 89.250.

### 5.4 Por qué la bomba de reinyección es crítica, en tres renglones

El panel lo dice sin teoría, con los números de la bomba:

1. **No hay bomba de sobra.** Con las tres sobran 43.675 bbl/d; si para una, faltan 44.100.
2. **El tanque aguanta horas y la reparación dura días.** El colchón es de 1,2 a 3,2 h, y una falla de P-201B dura en promedio **40 h** fuera de servicio (`historialDeEquipo`, MDT de 39,99 h) [demo]. Casi toda la parada cuesta crudo.
3. **Para seguido.** Lleva 9 fallas en 12 meses, una cada 41 días, y 37.315 bbl. Las partes: sello 5 veces y rodamientos 3 [demo].

Por eso, para la tubería del campo, el agua de La Ceiba **no es lo que limita** (§2.9), pero **sí es lo más frágil**. Con una sola bomba fuera, el agua pasa a ser el tramo más angosto. Es la distinción del principio 2, y la razón de «Si falla hoy» (§6).

### 5.5 Los otros dos casos del demo

| Campo | Cómo es su agua | Qué dice el panel |
|---|---|---|
| **Morichal Norte** | 7 bombas · P-201B mueve 79.900 · las otras seis toman 39.500 más · tanque de 60.000 bbl al 61,8 % [demo] | «Si para P-201B, faltan 40.400 bbl/d: el tanque aguanta **10 h** (entre 9,0 y 11,1) y después se pierden 783 bbl/d cerrando primero los más acuatosos (1.222 parejo).» Ahí el colchón alcanza para muchas reparaciones: más tanque y más respaldo valen barriles [demo] |
| **Guacamayo** | P-201B es de **recobro**; P-201C, de reserva, toma toda su agua hacia un pozo de disposición alterno [demo] | «Si para hoy, no cierra pozos: el agua tiene otra salida. Si sigue parada semanas, el yacimiento pierde presión: eso se trabaría "en el yacimiento".» Es la frase del motor («el efecto llega en semanas») con la palabra del tramo |

### 5.6 Dónde vive

| Pantalla | Quién | Qué versión |
|---|---|---|
| **Agua** («Agua y almacenamiento», `Agua.tsx`). Hoy está apagada en el MVP (`PANTALLAS_V2`). **Se propone encenderla** junto a Planta | `prod`, `conf`, `adm` | Completa: los cinco tramos, el colchón, la línea de tiempo y el orden de cierre |
| **Bombas** › ficha de la bomba de reinyección, que ya tiene colchón, respaldo y orden de cierre | `sup`, `oper`, `jefe`, `conf`, `tec` | En corto: las tres frases de §5.3 y el botón «Ver la tubería del agua» (solo para quien tiene Agua) |
| **Planta**, en «Capacidad por tren» | `prod`, `conf`, `adm` | El carril del agua lleva el enlace «Ver la tubería del agua» |

`Agua.tsx` ya se presenta como «El tren de agua de un campo: cuánta agua llega, cuánta saca la bomba de reinyección, cuánto aguanta el tanque y cuánto crudo depende de eso». Encenderla no es una pantalla nueva: es la que el producto ya había previsto para esto.

### 5.7 Cómo se enlaza con la tubería del campo

- El carril del agua dentro del tramo de la planta es esta misma tubería, pasada a crudo: 267.750 bbl/d de agua ≈ **13.574 bbl/d de crudo**, con el corte de las pruebas [cálculo U2].
- Con una bomba parada, la línea discontinua de dentro (§2.3) dice cuánto queda: «hoy, sin P-201B: 178.500 de 267.750 bbl/d de agua».
- Tocar el carril abre la pantalla Agua. En el teléfono, el renglón del agua es un enlace.

## §6 «Si falla hoy»

Es la criticidad dinámica de CHOKE-COMPLETO §10 (pieza 9). Es para **confiabilidad, el jefe de mantenimiento y la planeadora**.

### 6.1 Qué responde

**«¿Qué equipo le quita más barriles al campo si falla hoy, y lo está vigilando alguien?»**

Ese orden decide tres cosas: dónde va el próximo instrumento del vigía, qué ruta predictiva va primero y qué repuesto se pide ya (CHOKE-COMPLETO §10).

### 6.2 La cuenta, en palabras

En el ⓘ del título va el texto exacto:

> «Cuánto dejaría de sacar el campo por día si este equipo para hoy, después de lo que aguanta el tanque y de lo que toma el respaldo. Cambia con lo que esté parado: si para una bomba, sus hermanas valen más.»

Son tres casos, con la misma frase:
- **Equipo de un solo pozo** (electrosumergible, bombeo mecánico): cuesta el crudo de ese pozo, sin colchón.
- **Equipo compartido sin respaldo ni colchón** (aire, pórtico, multifásica): cuesta el crudo de todo lo que cuelga de él, desde el primer minuto.
- **Equipo con colchón o respaldo** (bombas de agua con tanque): cuesta **cero** mientras el colchón o el respaldo alcancen, y después el crudo de los pozos que hay que cerrar, en el orden que menos cuesta.

Es la misma lógica que ya usa el motor para el «si falla hoy» de Riesgo (`costoDeBomba`). Aquí se extiende a todos los equipos y se ordena.

### 6.3 La lista de La Ceiba, hoy

La lista va ordenada por **bbl/d**. Si dos empatan, va primero el de menos colchón. Al lado, cuando hay historia, va lo que **una falla** costaría en total: es la cifra «si falla hoy ≈ bbl» de Riesgo.

| # | Equipo | Se trabaría en | Si falla hoy | Después de | Una falla le cuesta ≈ | ¿Lo vigila TRIM? |
|---|---|---|---|---|---|---|
| 1 | **K-101** · aire de instrumentos | la planta · todo el campo | **9.394 bbl/d** | sin colchón | sin cifra: es un servicio, depende de cuánto dure (la regla de Riesgo) | Sí. ◆1 **degradado**: «la presión de cabezal cae hace 7 días… hoy quedan 11» min de autonomía del recibidor (la norma pide de 5 a 30) |
| 2 | **SE-2** · pórtico de 13,8 kV | la planta · 18 pozos | **9.394 bbl/d** | sin colchón | sin cifra (servicio) | Sí (II-0021) · sin respaldo |
| 3 | **P-201A** · bomba de reinyección (y P-201C, igual) | la planta · el agua de los 18 pozos | **3.059 bbl/d** | **2 min**: el tanque ya está al 89,6 % | sin historia propia | ┄ **No: sin instrumento** |
| 4 | **LC-11** · electrosumergible | el pozo | 1.031 bbl/d | sin colchón | — | Sí |
| 5 | **LC-08** · electrosumergible | el pozo | 893 bbl/d | sin colchón | — | Sí |
| 6 | **LC-04** · electrosumergible | el pozo | 825 bbl/d | sin colchón | — | Sí |
| … | LC-05 812 · LC-14 783 · LC-19 (bombeo mecánico) 778 · LC-06 692 · … | el pozo | | | | |
| — | **LACT-01** · punto de medición y despacho | la planta · todo el campo | ┄ **sin dato**: falta el colchón del tanque de crudo | — | — | Sí |
| — | **C-401** · compresor de gas | la planta · ┄ falta saber a qué pozos cierra | ┄ **sin dato** | — | — | Sí |
| — | **H-302** · tratador térmico | la planta | **0** mientras el respaldo esté bien | respaldo en línea: H-301 | — | Sí |

Fuentes:
- K-101: `riesgoAhora` (`bblDia` 9.394 y su motivo) [demo].
- SE-2: la regla del motor para un servicio, «se cierra lo que esté produciendo» (`riesgoDeCampo`), con el mismo 9.394. Hoy el motor no la da para SE-2 porque SE-2 no está en alarma [cálculo U2].
- P-201A: `ordenDeCierre` con 174.033 bbl/d que entran y una sola bomba de 89.250, o sea 84.783 bbl/d de agua sin salida y 8 pozos a cerrar en orden (4.577 si fuera parejo) [cálculo U2].
- Electrosumergibles: `crudoAsignado` [demo].
- Redundancias y «sin instrumento»: `equipos.ts` y la captura `prod-planta-ceiba.png` («P-201A sin instrumento», «P-201C sin instrumento») [demo].

**Lo que está parado no entra en la lista:** ya está en «Perdiéndose ahora». P-201B tiene su renglón arriba de la tabla:

> «◆1 **P-201B parada** · perdiéndose ahora 1.665 bbl/d. Cuando vuelva: si falla otra vez, 1.426 bbl/d después de unas 1,8 h de colchón.»

Fuentes: `prediccion` [demo]; el colchón es el del 2-oct.

**La línea de abajo**, que es la que hace dinámica a la lista:

> «Cambió hoy: **P-201A y P-201C subieron al puesto 3** porque P-201B está parada. Con las tres en marcha, la falla de cualquiera cuesta lo de P-201B: 1.426 bbl/d después de unas 1,8 h. Ninguna de las dos tiene instrumento: TRIM no verá venir su falla.»

Las tres bombas son iguales (`planta.ts`), y por eso se usa la cifra de P-201B [cálculo U2]. Esta línea es el puente con el norte: **el equipo que hoy más vale no tiene vigía.**

### 6.4 Lo que decide cada rol con la lista

| Rol | Qué mira | Qué decide | Texto que lo empuja |
|---|---|---|---|
| `conf` | «¿Lo vigila TRIM?» en los primeros puestos | Dónde va el próximo instrumento y qué ruta de vibración o termografía va primero | «2 de los 3 primeros no tienen instrumento: P-201A y P-201C» |
| `jefe` | Los primeros puestos y el programa de la semana | No intervenir hoy lo que hoy vale más | «Ojo: P-201A vale más mientras P-201B esté parada. ¿Mover el preventivo?» (§1.5) |
| `plan` (v2) | La columna «¿alcanza el repuesto?» | Qué pedir ya | P-201B: «Kit de sello mecánico · 0 en bodega · llega 1 el 9 de oct» · «Impulsor y anillos de desgaste · 0 en bodega · pedirlo: 45 días». Es lo que hoy muestra su ficha (captura `sup-bombas-ficha-P-201B.png`) [demo] |

### 6.5 Lo que se gana desembotellando (gerente y producción)

CHOKE-COMPLETO §10 pide que el mismo modelo sirva para decidir inversión. Con el demo, la respuesta es honesta y no es la obvia:

- **Una cuarta bomba no le da a La Ceiba ni un barril de capacidad**, porque hoy limitan los pozos (§2.9) [cálculo U2].
- **Lo que da es que una falla no cueste.** Con un respaldo que tome toda el agua de la bomba que para, el motor ya responde «el respaldo absorbe toda el agua: parar no cierra pozos» y su costo pasa a **0** (`costoDeBomba`). Hoy, cada falla de P-201B le ha costado en promedio **4.593 bbl** al campo (`historialDeEquipo`) [demo].
- En pantalla, para el gerente (F3), dice: «En La Ceiba, otra bomba de agua no sube la producción: evita que una falla cierre pozos. Hoy cada falla de P-201B cuesta unos 4.593 bbl.»

### 6.6 Teléfono

- En el teléfono, cada equipo es un renglón: el puesto, el equipo, «se trabaría en…» y la cifra.
- El colchón y el vigía van en una segunda línea.
- La línea «Cambió hoy» va arriba de la lista.

Boceto en §9.5.

## §7 El choke en el tiempo

Es la pieza 10 de CHOKE-COMPLETO (su §11). Es para **producción y confiabilidad**. El gerente ve solo el reparto mes a mes (§7.4).

### 7.1 La serie: qué limitó cada día

Es un panel nuevo debajo de la tubería: **«QUÉ LIMITÓ, DÍA POR DÍA»**.
- Es una franja horizontal con una celda por día. Cada celda lleva la **abreviatura** del tramo que limitó («Po», «Pl» o «Af», por pozos, planta o afuera) y un patrón de gris propio de ese tramo.
- Los días «casi iguales» van con las dos abreviaturas y la celda partida en diagonal.
- Debajo de la franja van las barras de lo perdido cada día por tramo, en grises apilados, más un tramo gris discontinuo para «sin identificar».

Así se ve de un vistazo si el tope se mueve o se queda quieto, y dónde se pierde.

Con el demo, mes a mes. Es un [cálculo U2]: pozos = Σ prueba × factor de asignación a mitad de mes; planta = el menor entre el tren de crudo y el agua pasada a crudo; afuera = la capacidad de `planta.ts`; el gas va fuera porque no se mide.

| Mes | La Ceiba: limita · le sigue (diferencia) | Con un umbral de 3 % (ejemplo) | Guacamayo: limita · le sigue (diferencia) | Con un umbral de 3 % |
|---|---|---|---|---|
| oct-25 | planta (crudo) 12.000 · pozos 12.467 (3,9 %) | planta | afuera 6.800 · pozos 6.887 (1,3 %) | casi iguales |
| nov-25 | pozos 11.999 · planta 12.000 (0 %) | casi iguales | afuera · pozos (0,4 %) | casi iguales |
| dic-25 | planta 12.000 · pozos 12.757 (6,3 %) | planta | afuera · pozos (3,4 %) | afuera |
| ene-26 | planta 12.000 · pozos 12.032 (0,3 %) | casi iguales | afuera · pozos (6,7 %) | afuera |
| feb-26 | planta 12.000 · pozos 12.455 (3,8 %) | planta | afuera · pozos (1,5 %) | casi iguales |
| mar-26 | planta 12.000 · pozos 12.553 (4,6 %) | planta | afuera · pozos (5,8 %) | afuera |
| abr-26 | pozos 11.964 · planta 12.000 (0,3 %) | casi iguales | afuera · pozos (4,6 %) | afuera |
| may-26 | planta 12.000 · pozos 12.403 (3,4 %) | planta | pozos 6.702 · afuera (1,5 %) | casi iguales |
| jun-26 | pozos 11.764 · planta 12.000 (2,0 %) | casi iguales | afuera · pozos (4,6 %) | afuera |
| jul-26 | planta 12.000 · pozos 12.316 (2,6 %) | casi iguales | afuera · pozos (1,0 %) | casi iguales |
| ago-26 | pozos 11.265 · planta 12.000 (6,5 %) | **pozos ← cambió** | pozos 6.607 · afuera (2,9 %) | casi iguales |
| sep-26 | pozos 11.551 · planta 12.000 (3,9 %) | pozos | afuera · pozos (1,2 %) | casi iguales |
| oct-26 | pozos 11.360 · planta 12.000 (5,6 %) | pozos | pozos 6.615 · afuera (2,8 %) | casi iguales |
| **Cambios** | **7** sin umbral | **1** | **5** sin umbral | **0** |

En los 13 meses, Morichal Norte siempre lo limitaron los pozos, con 3,1 % a 7,7 % de ventaja sobre la planta. El Palmar, también los pozos, con 3,4 % a 23,9 % [cálculo U2].

**Lo que la tabla le enseña al diseño:**
- **La Ceiba y Guacamayo viven en casi empate.** Sin umbral, la pantalla diría cada mes una cosa distinta, y nadie le creería.
- **En La Ceiba el agua nunca fue lo que limitó.** Con las tres bombas, el agua pasada a crudo valió entre unos 13.600 y 15.900 bbl/d según el mes. Siempre estuvo por encima de los pozos y del tren de crudo [cálculo U2]. Su problema es la fragilidad (§5.4), no la capacidad. Es la razón del principio 2 y una corrección a CHOKE-COMPLETO §0 (§12, punto 2).

### 7.2 El aviso «Cambió lo que limita»

| Regla | Cómo | Por qué |
|---|---|---|
| Solo avisa si el tramo nuevo gana por más del umbral de «casi iguales» | Umbral de producto, 3 % de ejemplo, a validar con Edinson. No es la banda del factor de asignación (§0, principio 7) | Sin umbral habría 7 avisos en 13 meses en La Ceiba y 5 en Guacamayo; con el de ejemplo, 1 y 0 [cálculo U2] |
| …y si lo sostiene **{n} días seguidos** | {n} es de producto, 3 de ejemplo | Un día con una prueba nueva no es un cambio |
| Avisa **de una vez**, sin esperar, cuando se firma un cambio de capacidad | Por ejemplo, entra una bomba nueva o se amplía la nominación | El cambio es cierto: lo firmó alguien |
| Mientras están dentro del umbral | La tubería dice «casi iguales» y no avisa | §1.5 |

**Texto del aviso** (§1.5):
> «Cambió lo que limita en La Ceiba: desde el {fecha} limitan los pozos (11.265 bbl/d); antes, la planta · tren de crudo (12.000). Cambian los equipos que más cuestan si fallan: revise "Si falla hoy".»

**Quién lo recibe:** `prod` y `conf`, en pantalla (la campana de la cabecera) y por correo. No va por WhatsApp, porque no pide nada en la próxima hora. La regla de U1 §2.6 es que WhatsApp es para lo que alguien tiene que contestar.

**Por qué importa el aviso.** Cuando cambia lo que limita, cambia **dónde rinde** el trabajo:
- si limitan los pozos, sirven el workover y el levantamiento;
- si limita la planta, sirven la confiabilidad de la planta y su ampliación.

Lo dice CHOKE-COMPLETO §11: «cambian los equipos críticos».

### 7.3 «Antes → con TRIM», por tramo

Hoy el Resumen del gerente ya muestra «diferido alto impacto · antes → con TRIM: **310 → 255 bbl/d · −18 %**» para La Ceiba (captura `ger-resumen-ceiba.png`; `ResumenDirectivo.tsx`) [demo]. Con el choke, la misma comparación se abre por tramo. Se hace con lo **no planeado** por día, que es lo que pide CHOKE-COMPLETO §11 («la brecha de disponibilidad no planeada por choke»), y con los mismos rangos de fechas:

| La Ceiba · no planeado, bbl/d | Antes (jun–ago 2026) | Con TRIM (1-sep a 2-oct) | Cambio |
|---|---|---|---|
| En la planta | 271 | 62 | −77 % |
| En los pozos | 117 | 204 | +74 % |
| Sin identificar | 3 | 11 | — |

| Todos los campos · no planeado, bbl/d | Antes | Con TRIM |
|---|---|---|
| En la planta | 614 | 325 |
| En los pozos | 806 | 754 |
| Sin identificar | 15 | 27 |

Fuente: [cálculo U2] con `libro` sobre los mismos rangos que usa `ResumenDirectivo` y la regla de tramo de P1 §2.1.

**Diseño honesto:**
- Se muestran las dos flechas, **la que baja y la que sube**. En La Ceiba la planta mejoró, porque P-201B paró menos. Los pozos empeoraron: en septiembre fallaron las electrosumergibles de LC-11 y LC-04.
- Un «−18 %» solo escondería que el trabajo pendiente está en los pozos.
- La frase de abajo: «En La Ceiba bajó lo que se trabó en la planta y subió lo de los pozos.»
- **«Con TRIM» es un mes.** La cifra lleva la marca gris de muestra corta y el ⓘ: «Un mes es poco para afirmar una mejora: la comparación vale cuando haya tres meses» (PLAN-MAESTRO §1: «Nada de esto se puede afirmar sin una línea base»).
- Para el piloto real, la cifra sale de datos reales, no del demo (PLAN-MAESTRO §1).

Lo que el vigía volvió planeado se nombra aparte, porque es el norte en acción. En Morichal, en septiembre, dos cambios de electrosumergible entraron como **programados** porque «el vigía anticipó la falla de bomba de fondo» (MN-16 y MN-05, 1.385 bbl) [demo]. La línea dice: «Septiembre: 2 fallas anticipadas pasaron a planeadas (1.385 bbl)».

### 7.4 Lo perdido por tramo, mes a mes (gerente incluido)

- El panel «DIFERIDO MES A MES» del Resumen apila hoy «alto impacto» y «lo demás» (`ResumenDirectivo.tsx`).
- Gana un selector de dos posiciones: **«Por equipo»**, que es el de hoy, y **«Por dónde se trabó»**.
- En la segunda, cada barra se apila en los cuatro tramos, en grises de distinta luminancia (`--dato-1` a `--dato-4`), más «sin identificar» en gris discontinuo.
- La leyenda es de texto, con las cuatro palabras de §1.1.
- La línea del máximo firmado no cambia.

### 7.5 Teléfono y papel

- **Teléfono:** la franja de días se vuelve una lista de semanas, con una línea por semana: «Semana 39 · limitan los pozos 7 de 7 días».
- **Papel:** la franja se imprime con las abreviaturas y los patrones («Po», «Pl», «Af»), así que se lee en blanco y negro. Debajo va la tabla.

## §8 Configuración: la filosofía operacional

### 8.1 Por qué es una página propia y se llama así

Edinson lo dijo en la reunión: «desde cargar la **filosofía operacional**, que es lo que cuesta, los tarros, los equipos y las líneas físicas, la misma distribución de pozos, las mismas líneas, y todo el tema de facilidad, pues es fácil de adecuar» [22:34].

S1 §3, punto 2, encontró que ni P1 ni U1 la nombraban. Sin ella, el paso «¿Dónde se trabó?» cae a los valores por defecto.

**Decisión:**
- Es una **página con dirección propia** dentro de Configuración: «Filosofía operacional». Sigue el patrón de la conversión del árbol (U1 §5.1): es trabajo de horas, se comparte con un enlace y se puede volver a cualquier paso.
- Tiene **tres pasos** visibles arriba: **1 Equipos y pozos · 2 Capacidades · 3 Ver el impacto y firmar**.
- La usa `adm`, que prepara y firma con `config:firmar`. `prod` y `conf` la pueden abrir y comentar. `ger` no entra.

### 8.2 Paso 1 · Una sola pregunta por equipo: «¿A qué pozos sirve este equipo?»

El administrador **nunca escoge «pozo» o «planta»**: contesta un hecho, y TRIM deduce. Es el criterio único de Edinson, sin opción NSTA (CHOKE-COMPLETO §2).

| Respuesta (texto exacto del botón) | Lo que TRIM deduce (`ChokeDeElemento.alcance`) | Frase que muestra al instante |
|---|---|---|
| «A un solo pozo» + escoger el pozo | `dedicado` → pozo | «Si para, se traba en el pozo: es solo de LC-14.» |
| «A varios pozos» + escoger los pozos | `compartido` → planta | «Si para, se traba en la planta o estación: sirve a 3 pozos.» |
| «A todo el campo» | `compartido` → planta | «Si para, se traba en la planta o estación: sirve a los 18 pozos.» |
| «Es de otro dueño, más allá de la batería (oleoducto, transportador, cliente)» | `tercero` → afuera | «Si para, se traba afuera.» |
| «Es el punto de entrega: de la brida de salida de la batería hacia afuera» | `frontera` → afuera | «Si para, se traba afuera.» |
| «Es la llegada de la energía del proveedor (acometida, subestación de llegada)» | `compartido` → planta | «Si para, se traba en la planta o estación. Quién respondió (el proveedor o nosotros) se pregunta en cada parada.» |
| «Todavía no sé» | queda firmado «por saber» (`Config.topologiaPorSaber`): TRIM no adivina el tramo | «Mientras no se sepa, TRIM no adivina: sus paradas quedan sin tramo y en Identificar cada una pregunta «¿Dónde se originó la parada: en el pozo, en la planta o afuera?».» |

«Todavía no sé» (decisión del 22-oct): el motor **no** le pone a esas paradas el tramo de la regla por tipo de falla. El paso 2 queda en `faltan` con la pregunta de origen, que contesta quien revisa (nunca el operador), y en «Si falla hoy» el equipo va sin calcular, con el porqué. Con la topología firmada, un equipo nuevo del registro aparece «sin responder» y, mientras nadie lo conteste, su parada sí toma el tramo de la regla por tipo de falla: no es «Todavía no sé», es que nadie lo ha preguntado.

Los nombres de los alcances son los del motor en construcción (`AlcanceElemento` en `choke.ts`):
- `frontera` es la brida de salida hacia afuera;
- la acometida que **entra** es `compartido`, porque sirve a varios pozos.

P1 §2.1 llamaba `frontera` a la acometida. El tramo que resulta es el mismo, la planta, pero tiene que quedar un solo nombre (§12, punto 17). El administrador no ve ninguno de esos nombres: ve los botones.

En la lista, cada equipo dice en una línea lo que deduce TRIM, y con eso el administrador aprende la regla sin leer teoría:

```
SE-2 · pórtico 13,8 kV          sirve a todo el campo (18 pozos)   → se traba en la planta
```

### 8.3 TRIM propone la topología para que no haya que escribirla

Lo caro de la filosofía operacional es cargarla. TRIM ya tiene la mitad en sus datos, así que **propone y pide confirmar**, con su porqué. Nunca la llena sola.

| Fuente | Propuesta (texto exacto) | Datos del demo |
|---|---|---|
| El alimentador de cada pozo (`Pozo.alimentador`) | «Los 18 pozos cuelgan de SE-2: ¿SE-2 sirve a todo el campo?» | Los 18 pozos de La Ceiba y los 41 de Morichal cuelgan de SE-2 [demo] |
| Los pozos que mueve una bomba (`PerfilBomba.pozos`) | «MPP-301 mueve MN-07, MN-18 y MN-33: ¿sirve a esos 3?» | [demo] |
| Las cascadas de la historia | «Cuando cayó K-101 el 28-ene, cerraron los 18 pozos en cascada. Pasó 6 veces en 12 meses: ¿K-101 sirve a todo el campo?» · «Cuando paró C-401 en Morichal, cerraron 10 u 11 pozos (3 veces): ¿a cuáles sirve?» | K-101: 6 caídas de 15 a 18 pozos · C-401 en Morichal: 3 caídas de 10 y 11 pozos [demo] |
| Lo que dice el registro del equipo (`Equipo.aguasAbajo`) | «El registro dice que K-101 llega a "todo el campo".» | [demo] |
| **Dos fuentes que no cuadran** | «El registro dice que V-101 sirve a "4 pozos", pero el esquema lo pone después del cabezal común de todos. ¿Cuál es?» | V-101: `aguasAbajo: '4 pozos'` en `equipos.ts`, y el esquema de `planta.ts` lo pone después del manifold [demo] |

**Aceptar** sí se puede en lote, pero solo dentro de un mismo tipo de equipo, con un toque que dice cuántos acepta, como la aceptación de sugerencias de U1 §5.3.

**Carga masiva:** «Subir Excel o CSV» con dos columnas, *equipo* y *pozos a los que sirve* (lista o «todos»). Es el mismo camino que la carga del árbol (U1 §5.2), con los errores que bloquean dichos por fila: equipo que no existe, pozo que no existe, equipo repetido.

### 8.4 Paso 2 · Las capacidades de los tramos

Hoy son números fijos del demo (`PlantaCampo.chokes` y `caudales.*Cap`, `planta.ts`). Pasan a ser **configuración firmada**, como pide CHOKE-COMPLETO §3.

| Capacidad | Unidad que se escribe | La Ceiba hoy | Cómo se llena |
|---|---|---|---|
| Tren de crudo | bbl/d de crudo | 12.000 [demo] | A mano, con su fuente |
| Tren de agua | **No se escribe el total.** Se escribe cada bomba y su límite | 3 × 89.250 = 267.750 [demo] | Sale de las bombas configuradas (`capacidadBpd`) y del límite del cabezal. TRIM muestra la suma |
| Tren de gas | KPC/d de gas, y si se mide o no | 4.200 de capacidad, sin medir [demo] | A mano. Si no se mide, el carril queda en «sin medir» (§2.3) |
| Afuera | bbl/d de crudo, partido en oleoducto, carrotanques, punto de despacho y nominación aceptada | 14.000, y el cliente 15.000 [demo] | A mano, con su fuente y fecha. La nominación cambia por mes |
| Tratamiento de agua | bbl/d de agua | sin dato: no está en el esquema [demo] | A mano, si el campo lo tiene |
| Admisión de los inyectores | bbl/d de agua | 267.750: dato del demo deducido del límite del cabezal (`TREN_AGUA`), sin firmar | A mano, con la prueba de inyectividad. Es un dato de la operadora (CHOKE-COMPLETO §16) |

**El paso a crudo nunca se escribe:** TRIM lo calcula con el corte de agua y lo muestra al lado. Así nadie escribe un número que cambia todos los días.

**Validación** (textos exactos):

| Regla | Mensaje | Bloquea la firma |
|---|---|---|
| Número mayor que cero | «Escriba un número mayor que cero.» | Sí |
| Menor que lo que ya pasó por el tramo (el máximo diario de los últimos 30 días) | «Por este tramo ya pasaron {q} {unidad} el {fecha}, y usted escribe {c}: no puede dejar pasar menos de lo que ya pasó. Revise el número o la unidad.» | Sí |
| Fuente obligatoria | «¿De dónde sale este número?» → «Placa del equipo» · «Prueba de capacidad» · «Contrato de transporte» · «Nominación aceptada» · «Estimado de ingeniería» | Sí |
| Cambio grande frente a la versión vigente | «Cambia {x} % frente a lo vigente ({antes}). ¿Es correcto?» (umbral de producto: 20 % de ejemplo) | No: pide confirmar |
| Empate exacto con otro tramo | «Con este número, {A} y {B} dan exactamente lo mismo. El método pide explicar un empate: escriba por qué.» (NSTA §5.4, vía R2 §1.2a) | Sí, hasta que se explique |
| Unidad de gas | «El gas va en KPC por día (miles de pies cúbicos).» (U1 §3.4) | — |

### 8.5 Paso 3 · Ver el impacto y firmar

Antes de firmar, TRIM pasa la versión nueva sobre los datos y muestra **lo que cambia, en palabras**:

```
SI FIRMA ESTA VERSIÓN · La Ceiba · rige desde el 22-oct
Qué limita hoy          los pozos → los pozos               (no cambia)
Si falla hoy            P-201B: 1.426 → 0 bbl/d              (la 4.ª bomba toma su agua)
                        P-201A y P-201C: 3.059 → 0 bbl/d     (con P-201B parada)
Dónde se trabó          0 paradas cambian de tramo           (solo cambian las capacidades)
Meses cerrados          no cambian: cada día usa la versión que regía
```

(Cambio de ejemplo: «se agrega P-201D en paralelo». Las cifras de «antes» son las de §6; el «0» es la regla del motor cuando el respaldo toma toda el agua.)

Si el cambio es **de topología**, la línea «Dónde se trabó» lo cuenta así:

> «23 paradas de los últimos 3 meses cambiarían de tramo: 21 pasan de la planta al pozo (ver). Las ya confirmadas no cambian solas: quedan "para revisar" en Identificar.» (ejemplo)

Así una firma de configuración nunca reescribe en silencio lo que una persona ya confirmó. Es la regla de P1: cada parada guarda la versión con que se clasificó.

**La firma** usa el bloque «FIRMAR LA VERSIÓN» que ya existe en Configuración: motivo obligatorio, «rige desde» y versiones que nunca se sobrescriben (`Configuracion.tsx`).

Hay que cambiar un texto de hoy: el desplegable «Esquema de planta» dice «topología · no cambia cálculos». Con el choke, **la topología sí cambia** dónde se trabó cada parada y lo que cuesta cada falla. Ver §12, punto 7.

### 8.6 El caso de borde: un transformador que alimenta 2 o 3 pozos de la misma locación

CHOKE-COMPLETO §16 lo deja abierto: la regla dice planta, porque sirve a varios, y falta que Edinson lo valide. En la pantalla:

1. El administrador contesta «A varios pozos» y escoge LC-12, LC-14 y LC-15 (ejemplo: el demo no tiene transformadores de pozo).
2. TRIM deduce y lo dice: «Si para, se traba en la planta o estación: sirve a 3 pozos.»
3. Como los tres pozos son de la **misma locación**, sale una etiqueta gris: **«caso de borde: pozos de una misma locación»**, con este ⓘ:
   > «Falta que Edinson confirme si un transformador que alimenta 2 o 3 pozos de una misma locación va al pozo o a la planta. Hoy va a la planta, porque sirve a varios. Si la regla cambia, todos los equipos con esta etiqueta cambian juntos, con vista previa y firma.»
4. El administrador **no** puede escoger «pozo» para este equipo. Si pudiera, cada operadora tendría su criterio y los campos dejarían de compararse (CHOKE-COMPLETO §2).
5. Para saber que son «de la misma locación», TRIM necesita la locación de cada pozo. Hoy ese dato no existe en `Pozo`: es un pedido (§11).

La etiqueta sirve para que, el día que Edinson conteste, se vea en una lista cuántos equipos y cuántas paradas cambian.

### 8.7 En el teléfono

La configuración es trabajo de escritorio, pero el administrador muchas veces está en campo cuando descubre cómo está conectado un equipo. En el teléfono, la página muestra **una pregunta por pantalla**: el equipo, «¿A qué pozos sirve?» y los botones de §8.2. Lo que se contesta queda en borrador; la firma se hace en el escritorio. Boceto en §9.4.

## §9 Bocetos ASCII

Son seis pantallas, cada una en teléfono (38 caracteres de ancho) y en escritorio. Los bocetos de teléfono y la tubería de escritorio se armaron con un script para que las columnas y los altos queden exactos.

Las cifras son las del demo del 2-oct-2026 a las 14:00, con sus marcas de «Cómo leer las cifras». Lo que dice (ejemplo) no es dato.

**Marcas usadas:**

| Marca | Qué es |
|---|---|
| `┏━┓` | Doble contorno: el tramo que limita |
| `◄ LIMITA` | Su texto |
| `▓` | Lo que pasa hoy, en la tubería; «en los pozos», en las barras del gerente (gris oscuro) |
| `░` | El yacimiento (fuente) en la tubería; «afuera» en las barras del gerente |
| `▒` | «En la planta» en las barras del gerente |
| `┄` y `╌` | Gris discontinuo: falta, sin dato o sin firmar (U1 §2.1) |
| `◆1` | Rombo de prioridad 1 de un **equipo**, en la paleta vigente: hoy rojo; desde F2, naranja (U1 §9.2) |
| `▲2` | Triángulo de prioridad 2 |
| `■3` | Cuadrado de prioridad 3 |
| `[ ]` | Botón |
| `ⓘ` | Ayuda |

### 9.1 La tubería del campo (producción)

**Escritorio**, en Producción y en Planta. El alto de cada caja es proporcional a lo que deja pasar: 11.360, 12.000 y 14.000. Las bases van alineadas, y así el nivel oscuro de «pasa hoy» (9.394) es una sola línea recta.

```
PRODUCCIÓN · La Ceiba                                                       Octubre, en curso
LA TUBERÍA DEL CAMPO                                                qué limita hoy al campo  ⓘ
pruebas de los pozos al 2-oct · capacidades: dato del demo, sin firmar ┄      [Ver como tabla]

 YACIMIENTO      POZOS · 18             PLANTA O ESTACIÓN ◆1 P-201B   AFUERA
                                                                      ┌────────────────────┐
                                        ┌──────────────────────┐      │                    │
                 ┏━━━━━━━━━━━━━━━━━━┓   │                      │      │                    │
 ░░░░░░░░░░░░    ┃                  ┃   │                      │      │                    │
 ░░░░░░░░░░░░    ┃▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┃   │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│      │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
 ░░░░░░░░░░░░    ┃▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┃   │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│      │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
 ░░░░░░░░░░░░  ─▶┃▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┃──▶│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│─────▶│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│──▶ venta
 ░░░░░░░░░░░░    ┃▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┃   │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│      │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
 ░░░░░░░░░░░░    ┃▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓┃   │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│      │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
                 ┗━━━━━━━━━━━━━━━━━━┛   └──────────────────────┘      └────────────────────┘
 va con los      ◄ LIMITA               12.000 bbl/d                  14.000 bbl/d
 pozos ⓘ         11.360 bbl/d           le sobran 640                 le sobran 2.640
                                        crudo 12.000 · el menor       ┄ dato del demo, sin firmar
                                        agua ≈ 13.574 de crudo        cliente: 15.000
                                           (267.750 bbl/d de agua)
                                           ╌ hoy, sin P-201B: 178.500
                                        ┄ gas: sin medir
───────────────────────────────────────────────────────────────────────────────────────────────
A la planta le sobran 640 bbl/d: lo que den de más los pozos pasa, hasta 640 bbl/d.

▓ PASA HOY            9.394 bbl/d
PERDIÉNDOSE AHORA     1.966 bbl/d
   en la planta       1.665  ◆1 P-201B parada desde 03:52 · cerró LC-16 y LC-07         [Abrir]
   ┄ sin identificar    301  LC-21 · cerró 1-oct 18:20 · código CMD               [Identificar]
SE TRABÓ EN OCTUBRE (en curso) · 1.046 bbl                              [Ver por dónde se trabó]
   en el yacimiento 0 · en los pozos 118 (LC-05, baja tensión, por confirmar) ·
   en la planta 573 (P-201B) · afuera 0 · ┄ sin identificar 355 (LC-21 247 · LC-08 109)
```

En la pantalla, los tres carriles de la planta (crudo, agua y gas) van dentro de la caja, uno encima del otro (§2.3). En ASCII van como texto debajo. Tocar una caja abre su detalle, y tocar el carril del agua abre la pantalla Agua (§5.6).

**Teléfono** (producción en campo). Es la misma tubería de pie: el **largo** de cada barra es proporcional a lo que deja pasar.

```
┌──────────────────────────────────────┐
│ ☰ Producción         La Ceiba     ⓘ  │
│ LA TUBERÍA DEL CAMPO                 │
│ Qué limita hoy: los pozos            │
├──────────────────────────────────────┤
│ YACIMIENTO · va con los pozos  ⓘ     │
│  ░░░                                 │
│ POZOS · 18                ◄ LIMITA   │
│ ┃▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    ┃ 11.360    │
│ PLANTA O ESTACIÓN   ◆1 P-201B        │
│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓      │ 12.000  │
│  le sobran 640 · el menor: crudo     │
│  agua ≈ 13.574 · ┄ gas sin medir     │
│ AFUERA · oleoducto                   │
│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓          │     │
│  14.000 · le sobran 2.640            │
│  ┄ dato del demo, sin firmar         │
├──────────────────────────────────────┤
│ A la planta le sobran 640 bbl/d: lo  │
│ que den de más los pozos pasa.       │
│ ▓ pasa hoy          9.394 bbl/d      │
├──────────────────────────────────────┤
│ PERDIÉNDOSE AHORA   1.966 bbl/d      │
│ ◆1 en la planta     1.665            │
│    P-201B parada · LC-16, LC-07      │
│ ┄ sin identificar     301 · LC-21    │
│ [ Identificar LC-21              ]   │
├──────────────────────────────────────┤
│ SE TRABÓ EN OCTUBRE · 1.046 bbl      │
│ planta 573 · pozos 118               │
│ ┄ sin identificar 355                │
│ [ Ver por dónde se trabó         ]   │
└──────────────────────────────────────┘
```

### 9.2 La vista del gerente por campo

**Escritorio**, en Resumen › POR CAMPO. Las barras de producción y diferido de hoy no cambian. A cada campo se le suma un renglón «dónde se trabó» con su frase. El período es «Septiembre, cerrado», y los porcentajes salen de la regla de P1 §2.1 con la de baja tensión de §4.4 [cálculo U2].

```
RESUMEN DEL ACTIVO · Septiembre, cerrado
POR CAMPO                      producción / meta · bbl/d   diferido / máx. · bbl/d   bbl diferidos
 ▸ La Ceiba         [ barras de hoy, sin cambio ......................... ]          7.716
     dónde se trabó [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒]  pozos 87 % · planta 13 %
     Se trabó sobre todo en los pozos: LC-11 y LC-04 (electrosumergibles).
 ▸ Morichal Norte   [ barras de hoy, sin cambio ......................... ]         15.539
     dónde se trabó [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒]  pozos 56 % · planta 44 %
     En los pozos (MN-41, MN-33) y en la planta (P-201B, MPP-301).
 ▸ Guacamayo        [ barras de hoy, sin cambio ......................... ]          6.396
     dónde se trabó [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓]  pozos 100 %
     En los pozos: GU-05, GU-09 y GU-07 (electrosumergibles).
 ▸ El Palmar        [ barras de hoy, sin cambio ......................... ]          3.990
     dónde se trabó [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒]  pozos 67 % · planta 33 %
     En los pozos: PA-07 (bombeo mecánico). En la planta: V-101 (separador).
 ▸ La Zarza         [ barras de hoy, sin cambio ......................... ]            303
     dónde se trabó [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]  afuera 100 %
     Afuera: el comprador nominó menos gas (ZA-06).
     ▓ en los pozos · ▒ en la planta o estación · ░ afuera · █ en el yacimiento · ┄ sin identificar
──────────────────────────────────────────────────────────────────────────────────────────────────
PÉRDIDA · lo que salió y no se vendió                    sin eventos registrados en septiembre  ⓘ
```

- La frase la arma el motor: el tramo con más barriles y los equipos que más pesan en él. Es la regla de U1 §3.2: campo → dónde → qué equipo, sin datos técnicos.
- La pérdida sale «sin eventos registrados» porque el demo todavía no tiene `EventoPerdida`: llega en F1 (PLAN-MAESTRO §5). Ese es su estado vacío. Con eventos, la línea es la de U1 §4.3.
- En la pantalla, los segmentos son grises de distinta luminancia **con su palabra encima**, y nunca color.
- El orden de los segmentos es fijo y es el mismo de la tubería: yacimiento, pozos, planta, afuera y «sin identificar».

Con el mes en curso, La Ceiba se vería así:

```
 ▸ La Ceiba   …                                                                     1.046
     dónde se trabó [▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄]  pozos 11 % · planta 55 % · sin identificar 34 %
     Se trabó sobre todo en la planta: P-201B (bomba de reinyección). 355 bbl todavía sin identificar.
```

**Teléfono**:

```
┌──────────────────────────────────────┐
│ Resumen · septiembre, cerrado        │
│ DÓNDE SE TRABÓ CADA CAMPO      ⓘ     │
│ ▓ pozos ▒ planta ░ afuera ┄ falta    │
├──────────────────────────────────────┤
│ LA CEIBA                7.716 bbl    │
│ [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒] │
│ pozos 87 % · planta 13 %             │
│ Sobre todo en los pozos: LC-11 y     │
│ LC-04 (electrosumergibles)           │
├──────────────────────────────────────┤
│ MORICHAL NORTE         15.539 bbl    │
│ [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒] │
│ pozos 56 % · planta 44 %             │
│ Pozos: MN-41, MN-33 · Planta:        │
│ P-201B, MPP-301                      │
├──────────────────────────────────────┤
│ GUACAMAYO               6.396 bbl    │
│ [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓] │
│ pozos 100 % · GU-05, GU-09, GU-07    │
├──────────────────────────────────────┤
│ EL PALMAR               3.990 bbl    │
│ [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒▒▒▒] │
│ pozos 67 % (PA-07) · planta 33 %     │
│ (V-101, separador)                   │
├──────────────────────────────────────┤
│ LA ZARZA                  303 bbl    │
│ [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] │
│ afuera: el comprador nominó menos    │
├──────────────────────────────────────┤
│ PÉRDIDA · salió y no se vendió       │
│ sin eventos registrados        ⓘ     │
└──────────────────────────────────────┘
```

### 9.3 El paso «¿Dónde se trabó?» en Identificar

**Teléfono del supervisor.** La cadena de LC-16 y LC-07, que se confirma junta, y LC-05, que espera la respuesta del operador:

```
┌──────────────────────────────────────┐
│ ☰ Identificar        La Ceiba    ⓘ   │
│ POR CONFIRMAR 2 · FALTA UN DATO 1    │
│ SIN CAUSA 2                          │
├──────────────────────────────────────┤
│ ◆1 LC-16 y LC-07 · cerraron 05:43    │
│ por P-201B · 2 pozos · falta conf.   │
│ 1 Quién    Operador · Mantenimiento  │
│ 2 ¿Dónde se trabó?                ⓘ  │
│   En la planta o estación            │
│   TRIM lo dedujo: porque cerraron    │
│   por el tanque de agua lleno        │
│   mientras P-201B estaba parada      │
│ 3 Qué pasó       Diferida            │
│ 4 ¿Planeada?     No planeada         │
│ 5 Causa          No planeada -       │
│                  Proceso/Facilidades │
│ 6 Detalle        Parada estación/    │
│                  bombeo afecta pozos │
│   ┄ falta la parte de P-201B         │
│ [ Confirmar los 2                ]   │
│ [ Corregir dónde se trabó        ]   │
├──────────────────────────────────────┤
│ ▲2 LC-05 · paró 1-oct 09:16          │
│ baja tensión · falta un dato         │
│ 2 ¿Dónde se trabó?  En el pozo       │
│   propuesta: porque solo cayó LC-05  │
│   de los 18 pozos de SE-2            │
│   ┄ falta: «¿De dónde vino el corte?»│
│   WhatsApp a Jairo Peña · sin resp.  │
│ [ Responder por el operador      ]   │
└──────────────────────────────────────┘
```

La hoja que abre «Corregir dónde se trabó». Así la ve el supervisor: sin «En el yacimiento», con el pedido a producción.

```
┌──────────────────────────────────────┐
│ ¿Dónde se trabó? · LC-16             │
│ Ahora: En la planta o estación       │
│ (TRIM lo dedujo)                     │
├──────────────────────────────────────┤
│ ( ) En el pozo                       │
│     Solo afectó a este pozo          │
│ (•) En la planta o estación          │
│     Afectó a varios pozos            │
│ ( ) Afuera (oleoducto, transporta-   │
│     dor o cliente)                   │
│     Fuera de la batería              │
│ ¿Fue el yacimiento?                  │
│ [ Pedir a producción             ]   │
├──────────────────────────────────────┤
│ ¿Aplica a los 2 pozos de esta        │
│ parada?                              │
│ [ Sí, a los 2 ]  [ Solo a LC-16 ]    │
│ ¿Por qué lo cambia? (ya estaba       │
│ confirmada)                          │
│ [El equipo es de otro pozo]          │
│ [La raíz fue otra] [Otra razón…]     │
│ [ Guardar                        ]   │
└──────────────────────────────────────┘
```

A `prod` y `conf`, en vez de «¿Fue el yacimiento? Pedir a producción», les sale la cuarta opción: «( ) En el yacimiento · La roca o el fluido, no un equipo», seguida de «¿Qué lo muestra?» (§1.5).

**Escritorio** (prod, jefe, conf). Es la vista de dos columnas de U1 §10.1, con la línea de tiempo que explica el porqué del paso 2:

```
IDENTIFICAR · La Ceiba                                                         Octubre, en curso
┌ POR CONFIRMAR 2 ────────────┐┌ LC-16 y LC-07 · cerraron 2-oct 05:43 · por P-201B · 573 bbl ───────────┐
│◆1 LC-16, LC-07 · por P-201B ││03:52 P-201B paró ─ 1,85 h de colchón ─ 05:43 tanque lleno: cerraron    │
├ FALTA UN DATO 1 ────────────┤│                                                                        │
│▲2 LC-05 · ¿de dónde vino el ││1 Quién            Operador · Mantenimiento  TRIM lo dedujo: la falla   │
│   corte?                    ││                                             es de la bomba             │
├ SIN CAUSA 2 ────────────────┤│2 ¿Dónde se trabó? En la planta o estación   TRIM lo dedujo: porque     │
│▲2 LC-21 · ¿qué lo paró?     ││                   ⓘ                         cerraron por el tanque de  │
│■3 LC-08 · arrancó sin causa ││                                             agua lleno mientras P-201B │
├ REVISAR 0 ──────────────────┤│                                             estaba parada              │
└─────────────────────────────┘│3 Qué pasó         Diferida                  nada se regó               │
                               │4 ¿Planeada?       No planeada               no estaba en el programa   │
                               │5 Causa            No planeada - Proceso / Facilidades                  │
                               │6 Detalle          Parada estación/bombeo afecta pozos                  │
                               │                   ┄ falta la parte de P-201B: la dice quien la abra    │
                               │                                                                        │
                               │[ Confirmar los 2 ]  [ Corregir dónde se trabó ]  [ Corregir otro paso ]│
                               └────────────────────────────────────────────────────────────────────────┘
```

### 9.4 La configuración de la topología (administrador)

**Escritorio**, en Configuración › Filosofía operacional, paso 1. A la izquierda va la lista de equipos de La Ceiba, cada uno con lo que TRIM deduce. A la derecha, la pregunta y la propuesta de TRIM con su porqué. TR-A y su caso de borde son un ejemplo: el demo no tiene transformadores de pozo.

```
CONFIGURACIÓN › FILOSOFÍA OPERACIONAL · La Ceiba          borrador · guardado 10:42 · modelo choke ⓘ
 1 Equipos y pozos  ·  2 Capacidades  ·  3 Ver el impacto y firmar
Filtrar: [Sin responder 1] [Propuestas de TRIM 2] [Casos de borde 1] [Todos 13]  [Subir Excel o CSV]
┌ EQUIPOS · 13 ────────────────────────────────────┐┌ K-101 · Sistema de aire de instrumentos ─────────────┐
│✓ SE-2 pórtico 13,8 kV   todo el campo → planta   ││¿A qué pozos sirve este equipo?                       │
│? K-101 aire             propuesta de TRIM        ││( ) A un solo pozo                                    │
│✓ P-201B bomba de agua   los 18 pozos → planta    ││( ) A varios pozos                                    │
│✓ LACT-01 despacho       todo el campo → planta   ││(•) A todo el campo                                   │
│? V-101 separador        dos fuentes no cuadran   ││( ) Es de otro dueño, más allá de la batería          │
│┄ C-401 compresor        sin responder            ││( ) Es el punto de entrega (brida de salida)          │
│✓ TR-A transformador     3 pozos → planta         ││( ) Es la llegada de la energía del proveedor         │
│    ┄ caso de borde: misma locación (ejemplo)     ││( ) Todavía no sé                                     │
│… ver 6 más                                       ││                                                      │
└──────────────────────────────────────────────────┘│PROPUESTA DE TRIM                                     │
                                                    │Cuando cayó K-101 el 28-ene, cerraron los 18 pozos    │
                                                    │en cascada. Pasó 6 veces en 12 meses (15 a 18         │
                                                    │pozos). El registro dice «todo el campo».             │
                                                    │→ Si para, se traba en la planta o estación:          │
                                                    │  sirve a los 18 pozos.                               │
                                                    │[ Aceptar ]   [ Ver las 6 caídas ]                    │
                                                    └──────────────────────────────────────────────────────┘
```

- El administrador ve «modelo choke ⓘ» como rótulo secundario: es uno de los tres lugares de §1.3.
- En ningún botón dice «pozo» o «planta» como algo a escoger: eso lo deduce TRIM, y se lee en la flecha «→ planta».

**Teléfono**: una pregunta por pantalla, para cuando el administrador está en campo. Queda en borrador y se firma en el escritorio (§8.7).

```
┌──────────────────────────────────────┐
│ ← Filosofía operacional · La Ceiba   │
│ Equipo 7 de 13 · borrador            │
├──────────────────────────────────────┤
│ TR-A · transformador (ejemplo)       │
│ ¿A qué pozos sirve este equipo?      │
│ [ A un solo pozo                 ]   │
│ [ A varios pozos              ✓  ]   │
│   LC-12 ✓   LC-14 ✓   LC-15 ✓        │
│   [ + agregar pozo ]                 │
│ [ A todo el campo                ]   │
│ [ Es de otro dueño (afuera)      ]   │
│ [ Es el punto de entrega         ]   │
│ [ Llegada de energía del         ]   │
│ [ proveedor                      ]   │
│ [ Todavía no sé                  ]   │
├──────────────────────────────────────┤
│ Si para, se traba en la planta o     │
│ estación: sirve a 3 pozos.           │
│ ┄ caso de borde: pozos de una        │
│   misma locación                ⓘ    │
│ [ Siguiente equipo               ]   │
└──────────────────────────────────────┘
```

### 9.5 La lista «Si falla hoy» (confiabilidad, jefe y planeadora)

**Escritorio**, en Confiabilidad, como panel de arriba:

```
CONFIABILIDAD · La Ceiba                                                         hoy, 2-oct 14:00
SI FALLA HOY · modelo choke ⓘ                     ordenado por lo que el campo deja de sacar por día
◆1 P-201B parada · perdiéndose ahora 1.665 bbl/d · cuando vuelva: 1.426 bbl/d después de ~1,8 h
Cambió hoy: P-201A y P-201C subieron al puesto 3 porque P-201B está parada. Ninguna de las dos
tiene instrumento: TRIM no verá venir su falla.                                [Proponer un plan]
────────────────────────────────────────────────────────────────────────────────────────────────────
#  Equipo                        Se trabaría en     Si falla hoy  Después de   Una falla ≈   ¿Lo vigila TRIM?
1  K-101 aire de instrumentos    planta · todo       9.394 bbl/d  sin colchón  —             sí · ◆1 degradado
2  SE-2 pórtico 13,8 kV          planta · 18 pozos   9.394 bbl/d  sin colchón  —             sí
3  P-201A bomba de reinyección   planta · el agua    3.059 bbl/d  2 min        sin historia  ┄ sin instrumento
   P-201C (igual)                planta · el agua    3.059 bbl/d  2 min        sin historia  ┄ sin instrumento
4  LC-11 electrosumergible       el pozo             1.031 bbl/d  sin colchón  —             sí
5  LC-08 electrosumergible       el pozo               893 bbl/d  sin colchón  —             sí
6  LC-04 electrosumergible       el pozo               825 bbl/d  sin colchón  —             sí
   … ver 12 más (electrosumergibles y bombeo mecánico)
┄  LACT-01 punto de despacho     planta · todo      sin dato: falta el colchón del tanque de crudo
┄  C-401 compresor de gas        planta · ┄ falta   sin dato: falta saber a qué pozos cierra
0  H-302 tratador térmico        planta                        0  respaldo en línea: H-301
```

- «Proponer un plan» abre un plan de acción del ciclo «antes», con «instrumentar P-201A y P-201C». Son los planes que ya existen en el producto (`planes:decidir`; Resumen y Turno los muestran).
- La columna «¿alcanza el repuesto?» de la planeadora (§6.4) se agrega cuando se encienda `plan`.

**Teléfono**:

```
┌──────────────────────────────────────┐
│ Confiabilidad · La Ceiba             │
│ SI FALLA HOY                     ⓘ   │
├──────────────────────────────────────┤
│ ◆1 P-201B parada · 1.665 bbl/d ahora │
│ Cambió hoy: P-201A y P-201C suben    │
│ al puesto 3 · ┄ sin instrumento      │
├──────────────────────────────────────┤
│ 1 K-101 aire            9.394 bbl/d  │
│   planta · sin colchón               │
│   ◆1 degradado                       │
│ 2 SE-2 pórtico          9.394 bbl/d  │
│   planta · sin colchón · vigilado    │
│ 3 P-201A y P-201C       3.059 bbl/d  │
│   planta · 2 min de colchón          │
│   ┄ sin instrumento                  │
│ 4 LC-11 electrosum.     1.031 bbl/d  │
│   el pozo · sin colchón · vigilado   │
│ 5 LC-08 electrosum.       893 bbl/d  │
│ [ Ver 13 más                     ]   │
└──────────────────────────────────────┘
```

### 9.6 La tubería del agua

**Escritorio**, en la pantalla Agua, encendida para prod, conf y adm (§5.6). El tanque se dibuja como recipiente, con su nivel y la raya del alto-alto. Las tres bombas van en paralelo dentro de una caja: con una parada, se ve que quedan dos de tres. Los inyectores llevan el doble contorno de «limita» y, a la vez, «sin firmar» en su número: un tramo que limita con un dato sin firmar conserva la marca de «limita» y el número lleva la advertencia (§2.3).

```
AGUA Y ALMACENAMIENTO · La Ceiba                                                     hoy, 2-oct 14:00
LA TUBERÍA DEL AGUA                                                                                 ⓘ

AGUA DE LOS POZOS   TRATAMIENTO      TANQUE TK-AG-CE                  BOMBAS DE REINYECCIÓN          INYECTORES
                                     30.000 bbl
224.075 bbl/d       ┌┄┄┄┄┄┄┄┄┄┄┐     ┌──────────────────┐             ┌─────────────────────────┐    ┏━━━━━━━━━━━┓
con los 18 pozos    ┆ no está  ┆     │~~~~~~~~~~~~~~~~~~│─ alto-alto  │ P-201A 90.000 ┄ sin inst│    ┃ admisión  ┃
hoy 174.033 ─▶      ┆ en el    ┆ ─▶  │██████████████████│  90 %   ─▶  │ P-201B ◆1 PARADA        │ ─▶ ┃ 267.750   ┃
corte 94,9 %        ┆ esquema  ┆     │██████████████████│  89,6 %     │ P-201C 90.000 ┄ sin inst│    ┃ sin firmar┃
                    └┄┄┄┄┄┄┄┄┄┄┘     └──────────────────┘             └─────────────────────────┘    ┗━━━━━━━━━━━┛
                                     LT-2012 · 13:59                  3 × 90.000 de placa            ◄ limita
                                                                      el cabezal las deja en 89.250  el cabezal
──────────────────────────────────────────────────────────────────────────────────────────────────────────────
Con las tres bombas, al agua le sobran 43.675 bbl/d.
Si para una, faltan 44.100: el tanque se llena en 1 a 3 h y hay que cerrar pozos.
Cerrando primero los más acuatosos se pierden 1.426 bbl/d de crudo; cerrando parejo, 2.236.

HOY      ◆1 P-201B parada: P-201A y P-201C toman lo que entra (174.033 de 178.500). El nivel no sube.
EL 2-OCT 03:52 P-201B paró, tanque al 78,7 % ─ 05:43 lleno (1,85 h) ─ cerraron LC-16 y LC-07: 1.665 bbl/d
         evitable cerrando en orden: 30 bbl hasta ahora
SI PARA UNA DE LAS TRES · orden de cierre para quitar 44.100 bbl/d de agua:
         LC-02 (30 de crudo por cada 1.000 de agua) · LC-10 (34) · LC-01 (36) · LC-17 al 25 % · LC-07 al 12 %
POR QUÉ ES CRÍTICA  no hay bomba de sobra · el tanque aguanta horas y una reparación ~40 h ·
                   9 fallas en 12 meses (sello 5, rodamientos 3) · 37.315 bbl
```

**Teléfono**, dentro de la ficha de la bomba en Bombas. Es lo que ve el supervisor con la bomba parada:

```
┌──────────────────────────────────────┐
│ Bombas › P-201B · La Ceiba           │
│ ◆1 PARADA desde 03:52                │
│ Perdiéndose ahora 1.665 bbl/d        │
├──────────────────────────────────────┤
│ LA TUBERÍA DEL AGUA, HOY             │
│ Entra   174.033 bbl/d                │
│ Caben   178.500 (P-201A + P-201C)    │
│ Tanque  89,6 % · ┃ alto-alto 90 %    │
│ [███████████████████████████┃  ]     │
│ El nivel no sube: P-201A y P-201C    │
│ toman lo que entra.                  │
├──────────────────────────────────────┤
│ Con las tres, sobran 43.675 bbl/d.   │
│ Si para una, faltan 44.100: el       │
│ tanque aguanta de 1 a 3 h.           │
│ Si hay que cerrar, primero los más   │
│ acuatosos: LC-02 · LC-10 · LC-01 ·   │
│ LC-17 25 % · LC-07 12 %              │
│ → 1.426 bbl/d (parejo, 2.236)        │
└──────────────────────────────────────┘
```

A `conf`, que tiene Bombas y Agua, la misma ficha le muestra al final el botón «Ver la tubería del agua». El supervisor no tiene la pantalla Agua: la ficha ya le trae todo lo que necesita.

## §10 Pruebas con usuarios

**Método.** Es el de U1 §11:
- pruebas cortas de tareas con un prototipo navegable hecho de los bocetos de §9, y con el demo cuando exista;
- se mide en silencio y se pregunta al final;
- se usan las cifras del demo del 2-oct, para que todos vean lo mismo.

Las metas son **de producto**, no de una norma, y así se dicen.

### 10.1 Las tareas

| Código | Con quién | Tarea | Qué se mide | Meta (de producto) |
|---|---|---|---|---|
| **G-1** | Gerentes o directivos (3 a 5) | Con el Resumen de septiembre abierto: «¿Dónde se trabó La Ceiba y con qué equipos?» | Segundos desde que se le muestra la pantalla; acierto | **≤ 10 s**, con «en los pozos, LC-11 y LC-04», en 4 de 5. Nadie pregunta qué es un «tramo» |
| **G-2** | Los mismos | «¿La pérdida está sumada a esos barriles?» | Acierto | 5 de 5 dicen que no |
| **G-3** (F3) | Los mismos | Con la línea de desembotellamiento: «¿Una cuarta bomba de agua le sube la producción a La Ceiba?» | Acierto | 4 de 5: «no la sube; evita que una falla cierre pozos» |
| **P-1** | Ingenieras o ingenieros de producción (3 a 5) | Con la tubería de La Ceiba: «¿Qué limita hoy, y un workover daría barriles?» | Segundos; acierto | **≤ 30 s**: «los pozos; sí, hasta 640 bbl/d» |
| **P-2** | Los mismos | Con Guacamayo: «¿Qué limita?» | Si entiende «casi iguales» | Nadie dice «afuera, seguro»: dicen que los dos están casi iguales |
| **P-3** | Los mismos | Poner «En el yacimiento» a una parada por baja carga, con su evidencia | Toques; si encuentra la evidencia | **≤ 4 toques** |
| **S-1** | Supervisores (5 a 8) | Confirmar LC-16 y LC-07; después: «¿Por qué dice "en la planta"?» | Toques; explicación con sus palabras | **≤ 2 toques**. 4 de 5 lo explican («porque se llenó el tanque con P-201B parada») |
| **S-2** | Los mismos | Confirmar la caída de SE-2 de Morichal del 18-may (41 pozos) | Toques; si sabe qué confirmó | **1 toque**. Sabe decir «41 pozos por el pórtico». Es la pregunta 3 de U1 §11.1: si más de 1 de 5 no sabe qué confirmó, no se construye la confirmación de un toque |
| **S-3** | Los mismos | «P-201B paró y el tanque se llena: ¿qué pozos cierra primero?» | Segundos; acierto | **≤ 30 s**, con LC-02, LC-10 y LC-01, en 4 de 5 |
| **O-1** | Operadores (5 a 8), en campo, con su teléfono y con guantes | Todas las tareas de U1 §11.1 (T-A a T-E) y la O-2 | **Cuántas veces se le pide escoger el tramo** o ve «¿Dónde se trabó?» como pregunta | **0**. Una sola vez es una falla del diseño |
| **O-2** | Los mismos | «LC-05 paró por baja tensión: conteste ¿De dónde vino el corte?» | Acuerdo con lo que diría su supervisor | ≥ 80 % (la meta de U1 T-C) |
| **A-1** | Administradores de implementación o ingenieros de facilidades (3 a 5) | **Configurar TR-A, un transformador que alimenta LC-12, LC-14 y LC-15, sin explicarle antes qué es un choke** | Minutos; si abre la ayuda; si entiende el resultado | **≤ 2 min, sin ayuda**, en 4 de 5. Al preguntarle «¿dónde se trabaría si falla?», dice «en la planta, porque sirve a varios» |
| **A-2** | Los mismos | Aceptar o corregir la propuesta de K-101 | Toques; si lee el porqué | **≤ 3 toques**, y repite el porqué |
| **A-3** | Los mismos | Cambiar la capacidad del tren de agua y decir qué cambia antes de firmar | Si lee bien la vista previa | Nombra al menos 3 de las 4 líneas de §8.5 |
| **C-1** | Ingenieros de confiabilidad (2 o 3) | Con «Si falla hoy»: «¿Dónde pondría el próximo instrumento?» | Segundos; razón | **≤ 1 min**. Escoge P-201A y P-201C (o K-101 con su razón) y nombra «sin instrumento» |
| **J-1** | Jefes de mantenimiento (2 o 3) | «¿Haría hoy el preventivo de P-201A?» | Acierto | 3 de 3: «no, mientras P-201B esté parada» |

### 10.2 Con Edinson: que valide 10 paradas

Hay dos rondas:
1. **10 paradas del demo**, como ensayo. Una por caso de §4.4:
   - LC-11 (electrosumergible);
   - PA-07 (bombeo mecánico);
   - LC-16 (tanque de agua con P-201B parada);
   - SE-2 de Morichal (cascada de 41);
   - el 25-mar de La Ceiba (dos raíces);
   - LC-05 (baja tensión en un solo pozo);
   - Guacamayo (tanque de crudo por la nominación);
   - Morichal por C-401 (frecuencia bajada);
   - ZA-06 (el comprador nominó menos);
   - MN-22 (fuga en la línea de flujo).
2. **10 paradas reales** de la operadora piloto, escogidas por él.

**Criterio:** coincide con «¿Dónde se trabó?» en **9 de 10** o más. Cada desacuerdo termina en una de dos cosas: un cambio de regla versionado (`choke.topologia@2`) o una pregunta a la ANH. Nunca en un arreglo a mano.

**Preguntas que se le hacen en la misma sesión:**
1. «Un transformador que alimenta 2 o 3 pozos de una misma locación, ¿se trabó en el pozo o en la planta?» (CHOKE-COMPLETO §16; §8.6).
2. «Si solo cae un pozo por baja tensión y su pórtico alimenta 18, ¿lo ponemos en el pozo hasta que alguien diga de dónde vino el corte?» (§4.4, caso 8).
3. «Tanque de crudo alto porque el oleoducto nominó menos: ¿afuera, aunque el tanque sea propio?» (P1 §3.3).
4. «Pozos con la frecuencia bajada porque el compresor está limitado: ¿en la planta?» (§4.4, caso 4).
5. «Para un supervisor, ¿le sirve "En la planta o estación", o en sus campos se dice de otra forma?»
6. «¿Cuánta diferencia entre dos tramos le parece "casi igual"? ¿El 3 % de ejemplo es razonable?» (§0, principio 7).

### 10.3 Con Adair: que valide los colores

Se le muestran la tubería y la lista «Si falla hoy», impresas en color y en blanco y negro, con P-201B parada y K-101 degradado.

| Prueba | Meta |
|---|---|
| Prueba de 5 segundos, con él y con 5 operadores o supervisores: «¿Qué está en alarma en esta pantalla?» | Encuentran P-201B (y K-101) en **< 5 s**. **Nadie** dice que «limita» es una alarma |
| «¿El doble contorno gris con "limita" choca con algo de los SCADA de alto desempeño?» | Lo aprueba o propone otra forma, que entra a la guía de estilo del sitio |
| «¿La línea discontinua de "lo que queda hoy" (P-201B fuera) se confunde con "sin dato"?» | Si se confunde, «lo que queda hoy» pasa a línea punteada fina y «sin dato» se queda con la discontinua de U1 |

### 10.4 Accesibilidad

| Prueba | Meta |
|---|---|
| Lector de pantalla sobre la tubería | Lee la frase resumen de §2.8 en el orden correcto |
| Solo teclado | Llega a los cuatro tramos y a «Ver como tabla» sin ratón |
| Simulación de daltonismo (protanopía y deuteranopía) y copia en blanco y negro | Todas las marcas se distinguen por forma y texto |
| Contraste | Los tokens nuevos pasan la revisión WCAG de `verificar-libro.mjs` |

### 10.5 Preguntas al final, para todos

1. «Cuando dice "En la planta o estación", ¿qué entendió?»
2. «¿Qué quiere decir "limita"? ¿Es algo malo?» Se busca que **no** lo lean como alarma.
3. «¿Qué le dice "casi iguales"?»
4. «¿En su campo se dice "pozos acuatosos"? ¿Cómo les dicen a los que más agua dan?»
5. «¿La palabra "choke" le dice algo?» Se espera «la válvula», y así se confirma el principio 1.
6. Al gerente: «¿Qué decisión tomaría con esta barra?»

### 10.6 Criterio para pasar a construir

- G-1, P-1, S-1 y A-1 no fallan en más de 1 de cada 5 personas.
- O-1 da **0** en todas las sesiones.
- Nadie lee «limita» como una alarma. **Si lo hacen 2 de 5 o más, se cambia la marca**: se deja solo el texto «limita», sin el triángulo.
- Edinson coincide en 9 de 10 o más.
- Adair aprueba la forma de «limita» o propone la suya.

## §11 Pedidos a motor y producto

Rige la regla de P1 §2.10: **el motor calcula y la pantalla solo pinta**. Cada cifra de este diseño tiene que llegar hecha. Donde P1 ya tiene el nombre, se usa. Donde no, se propone uno, marcado «(nuevo)». Todo es aditivo y opcional en el contrato, como pide P1 §5.

### 11.0 Cómo encaja con lo que ya se está construyendo

Mientras se escribía este documento, `CHOKE-CONSTRUCCION.md` (21-oct, 15:28) le asignó la tanda 1 del motor a E1. E1 ya escribió:
- `src/entities/choke.ts`;
- `src/entities/datos/topologia.ts`;
- `TREN_AGUA` en `planta.ts`.

Se leyeron en **solo lectura**, en su versión de las 16:02, y se corrieron sobre el demo. Así encaja este diseño con lo que ya existe:

| Lo que este diseño necesita | Lo que E1 ya tiene | Qué falta o qué difiere |
|---|---|---|
| Los cuatro tramos y sus palabras | `ChokeAnh`, `ChokeCampo`, `ORDEN_CHOKE`, `NOMBRE_CHOKE`, `DONDE_CHOKE`, `SUBNIVEL_MERCADO` | `NOMBRE_CHOKE.planta` dice «En la planta». El dueño pidió «en la planta o estación» (§1.1; §12, punto 18). `DONDE_CHOKE['sin-asignar']` dice «sin identificar todavía» y coincide con la etiqueta de §2.3 |
| Topología derivada, «¿a qué pozos sirve?» | `AlcanceElemento`, `ChokeDeElemento` con el `choke` **derivado** (`chokeDeAlcance`), `validarTopologia`, `Config.topologia`, `topologiaDe`, `topologiaFirmada`, la topología del demo deducida de `Pozo.alimentador`, `CAMPO_PLANTA` y los perfiles de bombas | Resuelve el §12, punto 6. Falta el caso de borde (`casoBorde`, `Pozo.locacion`; §8.6) y las propuestas desde las cascadas (§8.3) |
| El porqué de cada parada | `chokeDeCausa` → `ChokeDeParada { choke, porque, elemento, servidos, pregunta, alcance, subnivel, fuente, regla }` | Cubre el pedido del porqué si E3 lo copia en la clasificación (`anh-clasificacion.ts`). En la baja tensión de un solo pozo propone la planta y ya hace la pregunta («¿La baja tensión llegó por la red del campo o fue del transformador o el variador del pozo?»). Difiere de §4.4, caso 8, solo en lo que se propone antes de la respuesta |
| Potenciales y lo que limita | `potencialesDelCampo` → `PotencialesCampo { pozos, planta, exportacion, trenes, trenQueLimita, mercado, mercadoBajo, sinDato, holgura, dominante, empate, explicacion, texto }` | **Mete el gas con la relación del esquema**, que no se mide (11.3, punto 1). Falta `casiIguales` con su umbral (§0, principio 7) |
| Reparto por tramo y escalón | `brechaPorChoke` → `BrechaChoke` · `eficienciaProduccion` | Que el total sea el del libro (§0, principio 6). Su encabezado dice que suma exacto |
| Serie y aviso | `serieChoke` → `{ dias: DiaChoke[], cambios: CambioDominante[] }` | `cambios` marca cada vuelta del dominante: falta el umbral y la persistencia (§7.2) |
| Tubería del agua | `TREN_AGUA`: bombas con placa, `admisionBpd` (La Ceiba 267.750; Morichal 605.500), `tratamientoBpd` ausente, `fuente` | `choke-agua.ts` todavía no está escrito. Hay que dejar **una sola cifra** para lo que caben dos bombas: 178.500 según la configuración (89.250 cada una) o 180.000 según la placa |
| Si falla hoy | Nada aún: `criticidad.ts` está asignado pero no escrito | Todo lo de §6 y las filas de 11.1 |
| La Zarza | `potencialesDelCampo('zarza')` arma una tubería de crudo: «a la planta le sobran 241 bbl/d» | Este diseño muestra el estado vacío de campo de gas (§1.5; PLAN-MAESTRO §3: solo crudo). §12, punto 19 |

Lo que E1 dé por el contrato (C1) es lo que pintan las pantallas (P1-UI a P4-UI). Las filas de 11.1 dicen qué tiene que traer cada pantalla, con los nombres de E1 donde ya existen.

### 11.1 Por pantalla

| Pantalla o elemento | Dato que necesita | Nombre en P1 o en el código | Propuesto (nuevo) | Fase |
|---|---|---|---|---|
| **Tubería** · lo que limita | El tramo de menor potencial, el empate exacto y desde cuándo | `chokeDominante(planta)` → `ChokeCampo`, `empate` (P1 §1.7) · `GET /vistas/campos/:campo/choke` → `{ dominante, potenciales, empate, desde }` (P1 §5.2) · **E1:** `potencialesDelCampo` → `PotencialesCampo` (`dominante`, `empate`, `holgura`, `texto`) | `casiIguales: ChokeCampo[] \| null` y el `umbral` con que se decidió | F1 |
| **Tubería** · potencial de cada tramo | Valor, unidad, fuente, fecha y firma | `Chokes` (`planta.ts:47`) · `trenesEnCrudo` (`planta.ts:66`) · `estadoCampo.potencialBpd` · **E1:** `PotencialesCampo.pozos`, `.planta`, `.exportacion`, `.sinDato` | `TramoTuberia { tramo, potencialBpd: number \| null, fuente, estado: 'firmado' \| 'demo' \| 'sin-firmar' \| 'sin-dato', firma? }` | F1 |
| **Tubería** · carriles de la planta | Capacidad de cada tren, en su unidad y en crudo, y si se mide | `Caudales` (`planta.ts:38`) · **E1:** `PotencialesCampo.trenes`, `.trenQueLimita` | `TrenTuberia { tren: 'crudo' \| 'agua' \| 'gas', capacidad, unidad, enCrudo: number \| null, medido: boolean }`. **Un tren sin medir no entra en el mínimo**: ver 11.3, punto 1 | F1 |
| **Tubería** · lo que pasa hoy | Crudo que sale ahora | `caudalesAhora(campo).crudo` (`diferido.ts`) | — | F1 |
| **Tubería** · le sobran | Diferencia de cada tramo con el que limita | — | `TramoTuberia.holguraBpd` | F1 |
| **Tubería** · lo que queda hoy | Capacidad que queda con un equipo parado y el motivo | Hoy lo arma la pantalla (`capFuera` en `Planta.tsx`) | `TramoTuberia.disponibleHoy?: { valor, unidad, equipo, texto }`, calculado en el motor | F2 |
| **Tubería** · perdiéndose ahora | Lo que se pierde ahora, por tramo | `riesgoAhora` con `estado: 'perdiendo'` | `Riesgo.tramo: ChokeAnh \| null` (`null` = sin identificar) | F1 |
| **Tubería** y **Resumen del gerente** · lo perdido por tramo | Σ bbl por tramo, más «sin identificar», con los equipos que más pesan y el **mismo total** que el libro | `GET /vistas/anh/reparto?por=choke` (P1 §5.2) | `equiposTop` por tramo · `sinTramoBbl` · la frase del gerente («tramo mayor + equipos») hecha en el motor | F1 |
| **Tubería** · todo junto | Una sola lectura | — | `GET /vistas/campos/:campo/tuberia?desde&hasta` → `TuberiaCampo { tramos: TramoTuberia[], limita, casiIguales, pasaHoyBpd, perdiendoAhora: Array<{ tramo, bpd, equipo }>, perdidoPeriodo: Array<{ tramo, bbl, equiposTop }>, sinTramoBbl }` | F1 |
| **Identificar** · paso 2 | El valor y su procedencia | `ClasificacionAnh.choke: DatoClasificado<ChokeAnh>` (P1 §1.4) · `regla: 'choke.topologia@1'` (P1 §1.3) | — | F1 |
| **Identificar** · el porqué en una frase | Los datos de la frase, no la frase armada en la pantalla | **E1:** `ChokeDeParada.porque`, `.elemento`, `.servidos`, `.pregunta` | Guardarlo con la clasificación: `DatoClasificado.porque?: { regla, elemento, pozosServidos?, cascada?: { raiz, minutos }, persona?, texto? }` | F1 |
| **Identificar** · baja tensión en un pozo | Cuántos pozos del alimentador cayeron juntos | `causa-senal.ts:306` (UV → `Pozo.alimentador`) | Regla `choke.topologia@2`: si cae uno solo, «pozo» como propuesta y la pregunta de energía; si caen varios en la ventana de cascada, «planta» (§4.4, caso 8) | F1 |
| **Identificar** · yacimiento | Que solo `prod` y `conf` lo puedan poner, con evidencia | `PASOS_QUE_CONFIRMA` (P1 §1.3) | Capacidad `anh:yacimiento` (prod, conf) y `ParadaAnh.evidenciaYacimiento?: 'prueba' \| 'corte-agua' \| 'presion' \| string` | F1 |
| **Identificar** · cascadas y tramos partidos | Agrupar por raíz; partir por cambio de causa | `ParadaAnh.eventoId`, `Causa.evento`, `fraccion` (P1 §1.5) | `ParadaAnh.raiz` (id de la causa raíz, para agrupar sin recalcular) | F1 |
| **Confiabilidad** · calidad del paso 2 | % confirmado, % corregido, correcciones por regla | `GET /vistas/anh/calidad` (P1 §5.2) | Lo mismo, abierto por `paso = 'choke'` y por equipo | F1 |
| **Agua** | Agua que entra, tratamiento, tanque, bombas, inyectores, colchón, orden de cierre y línea de tiempo | `prediccion` (`mueve`, `respaldoLibreBpd`, `aguaSinSalidaBpd`, `colchon`, `llenado`, `orden`), `paradaMedida`, `tanqueDe`, `NIVEL_AHORA`, `caudalesAhora` · **E1:** `TREN_AGUA` (y `choke-agua.ts`, por escribir) | `GET /vistas/campos/:campo/agua` → `TuberiaAgua` con lo de hoy más `tratamientoBpd: number \| null` y `admisionInyectoresBpd: number \| null`, y cada bomba con `instrumentada` y `marcha` | F2 |
| **Agua** · encenderla | Que la pantalla exista para prod, conf y adm | `PANTALLAS_V2` (`producto.ts`) · `roles.ts` | Sacar `agua` de `PANTALLAS_V2` y agregarla a las pantallas de `prod`, `conf` y `adm` | F2 |
| **Si falla hoy** | Para **todos** los equipos: tramo, bbl/d, colchón, costo por falla, si lo vigila, y por qué subió | `Riesgo.costoFalla`, `colchonH`, `costoDe`, `bblDia` (`diferido.ts`) · `costoDeBomba` · **E1:** `criticidad.ts`, por escribir | `GET /vistas/criticidad?campos` → `FilaCriticidad { campoId, equipo, tramo, bpd: number \| null, colchonH?, costoFalla?, costoDe?, vigilado: boolean, sinDato?: string, subio?: { desde, porque } }` | F2 |
| **Si falla hoy** · las hermanas de una bomba | Perfil de **cada** bomba del tren, no solo de la instrumentada | Hoy solo P-201B tiene perfil (`PERFILES` en `bombas.ts`); P-201A y P-201C están «sin instrumento» | Perfil mínimo sin tags (capacidad y papel) para cada bomba configurada | F2 |
| **Si falla hoy** · servicios | Lo que cierra un servicio que no está en alarma | La regla «se cierra lo que esté produciendo» solo corre para servicios en alarma (`riesgoDeCampo`) | La misma regla para todos los servicios | F2 |
| **Si falla hoy** · aviso de trabajos | Cruzar el programa con la lista | `ParadaProgramada`, `TareaPrograma` (P1 §1.12) | `AvisoTrabajoCritico { tarea, equipo, porque }` | F2 |
| **Serie** | Qué limitó cada día y lo perdido por tramo | **E1:** `serieChoke` → `{ dias: DiaChoke[], cambios }` | `GET /vistas/campos/:campo/choke/serie?desde&hasta` → `Array<{ dia, limita, casiIguales, potenciales, perdidoPorTramo }>`. Cada día usa la configuración que regía (`configEn`) | F3 |
| **Aviso «Cambió lo que limita»** | Detectarlo con el umbral y los días | **E1:** `CambioDominante { campoId, dia, de, a, texto }` (sin umbral) | `AvisoCambioLimita { campo, desde, de, a, valorBpd }` · parámetros de producto `umbralCasiIguales` y `diasParaCambio` (fijos, como los umbrales de las bandas, P1 §1.11) | F3 |
| **Antes → con TRIM** | Lo no planeado por tramo, antes y después | `lineaBase` (`libro.ts`) y la cuenta de `ResumenDirectivo` | `LineaBase.porTramo` | F3 |
| **Mes a mes por tramo** | El reparto mensual | `serieMensual` (`libro.ts`) | `MesLibro.porTramo` | F1 |
| **Filosofía operacional** · topología | Equipo → pozos a los que sirve | `ChokeDeElemento { elemento, choke, alcance, pozos? }` en `Config.anh.chokes` (P1 §1.6) · **E1:** ya en `Config.topologia`, con el `choke` derivado (`chokeDeAlcance`) y `validarTopologia` | `casoBorde?: 'misma-locacion'` | F1 |
| **Filosofía operacional** · locación | Saber qué pozos comparten locación | — | `Pozo.locacion?: string` | F1 |
| **Filosofía operacional** · propuestas | Topología deducida de los datos | `Pozo.alimentador`, `PerfilBomba.pozos`, `Equipo.aguasAbajo`, cascadas de `causa-senal.ts` | `GET /vistas/topologia/propuestas?campo` → `PropuestaTopologia { elemento, pozos, porque, fuente: 'alimentador' \| 'bomba' \| 'cascadas' \| 'registro', evidencia: string[], conflicto?: string }` | F1 |
| **Filosofía operacional** · carga masiva | Excel o CSV | — | `POST /api/topologia/importar` (con hallazgos por fila) | F1 |
| **Filosofía operacional** · capacidades | Las de los tramos, firmadas | `PlantaCampo.chokes` y `caudales.*Cap` (fijos del demo) · **E1:** `TREN_AGUA` (`bombas[].placaBpd`, `admisionBpd`, `tratamientoBpd`, `fuente`), como dato de demo | `Config.capacidades[campo]: { crudoBpd, bombasAgua: Array<{ equipo, capacidadBpd }>, limiteCabezalBpd?, gasKpcd, gasMedido, afuera: { oleoductoBpd?, carrotanquesBpd?, despachoBpd?, nominacionBpd? }, tratamientoAguaBpd: number \| null, admisionInyectoresBpd: number \| null, fuente, fecha }` | F1 (planta) · F3 (afuera) |
| **Filosofía operacional** · vista previa | Lo que cambia antes de firmar | — | `POST /api/configuracion/vista-previa` → `ImpactoConfig { limitaAntes, limitaDespues, criticidad: Array<{ equipo, antes, despues }>, paradasQueCambian: { total, confirmadas, porTramo } }` | F1 |
| **Filosofía operacional** · firma | Versión con motivo | `POST /api/configuracion` con `config:firmar` (ya existe) | Los cambios del esquema de planta que tocan la topología pasan por aquí, y no por `POST /api/planta/cambios` con `conector:configurar` (§12, punto 7) | F1 |
| **Todas** · palabras | Las palabras de campo de los tramos | Etiquetas ANH de P1 §1.2 (para `reg`) · **E1:** `NOMBRE_CHOKE`, `DONDE_CHOKE`, `NOMBRE_CHOKE_CAMPO`, `NOMBRE_ALCANCE` | Que `NOMBRE_CHOKE.planta` diga «En la planta o estación» y que las líneas de explicación de §1.1 vivan junto a esas constantes (`EXPLICA_TRAMO`) | F1 |

### 11.2 Decisiones que el motor tiene que tomar y la pantalla va a mostrar

1. **El potencial de los pozos lleva factor de asignación.**
   - Se recomienda que sí, para que sea el mismo «potencial» de Producción (`estadoCampo.potencialBpd`) y la misma cifra en todas partes (§0, principio 6). Así lo hace ya `potencialesDelCampo`.
   - Esto cambia el resultado en Guacamayo: con factor, los pozos dan 6.615 y quedan por debajo de afuera (6.800); sin factor dan 6.828 y quedan por encima [cálculo U2].
   - Producto decide y la ⓘ lo dice.
2. **El umbral de «casi iguales» y los días para avisar** son parámetros fijos de producto, versionados (§0, principio 7). Se validan con Edinson (§10.2, pregunta 6).
3. **«Afuera» se compara contra lo que despacha el punto de medición oficial**, no contra lo que dicen las pruebas. Es otra razón para usar el potencial con factor.

### 11.3 Hallazgos del demo que el motor no puede heredar sin revisar

1. **El gas sin medir no puede decidir lo que limita.**
   - `trenesEnCrudo` pasa el tren de gas a crudo con el caudal de gas **declarado** en `planta.ts`. Con los caudales del demo, el gas de La Ceiba daría 11.400 bbl/d de crudo [demo].
   - El motor en construcción ya lo usa así. `potencialesDelCampo` (`choke.ts`, versión de las 16:02) mete el gas con la relación crudo/gas del esquema, y su resultado para La Ceiba es **planta 11.400 (gas)** y el texto «Hoy limitan los pozos: a la planta le sobran 40 bbl/d». En Morichal da planta 17.890 (gas) y «le sobran 286» [corrido en solo lectura].
   - Sin el gas, que nadie mide, la planta de La Ceiba es 12.000 (tren de crudo) y le sobran **640**. La de Morichal es 18.320 (agua) y le sobran **716** [cálculo U2].
   - El gas no se mide en esta fase («El gas no se mide en esta fase», `Planta.tsx`), así que **un número declarado estaría decidiendo** cuánto le sobra a la planta y, con otra cifra del esquema, qué limita.
   - **Pedido:** un tren sin medir queda fuera del mínimo y se dibuja «sin medir» (§2.3). Si producto prefiere conservarlo, que el tramo lleve «gas: declarado, no medido» y que la frase no dé una holgura que dependa de él.
2. **`Campo.choke` y `PlantaCampo.chokes` no coinciden con lo calculado** en La Ceiba y en El Palmar (§2.9). P1 §1.7 ya lo da por obsoleto: la pantalla no lo lee.
3. **La nota de La Ceiba en `planta.ts`** dice que el agua «es el cuello de botella del campo». Con el cálculo, el agua es el tramo **más frágil** (§5.4), no el que limita (§7.1). Es un texto del demo que habría que corregir cuando se construya.
4. **V-101 dice «4 pozos» aguas abajo** (`equipos.ts`), pero el esquema lo pone después del cabezal común. La propuesta de topología lo muestra como conflicto (§8.3).

## §12 Desacuerdos y mejoras frente a U1, P1 y CHOKE-COMPLETO

Cada punto dice qué dice el otro documento, qué propongo y por qué. Desde el punto 16 entra también lo que ya está escrito en el motor en construcción (`choke.ts`, E1, leído en solo lectura; §11.0).

1. **U1 §3.2 y §10.2, y CHOKE-COMPLETO §12: la línea del supervisor mezcla dos preguntas.**
   - **Dicen:** «Hoy limita: Planta · disposición de agua (P-201B fuera, 1 de 3 bombas)».
   - **Propongo** dos líneas:
     - «Qué limita hoy: los pozos (11.360 bbl/d)», que es estructural;
     - «Perdiéndose ahora: ◆1 P-201B parada · 1.665 bbl/d», que es el evento.
   - **Por qué:** con las cifras del demo, lo que limita a La Ceiba son los pozos, casi empatados con el tren de crudo. El agua solo pasa a ser el tramo más angosto mientras una bomba está parada (§2.2, §7.1). Si se mezclan, el supervisor cree que el agua es el tope del campo aunque las tres bombas estén en marcha.

2. **CHOKE-COMPLETO §0: «el tramo estrecho suele ser el agua en planta» `[INFERENCIA]`.**
   - **Propongo** cambiarlo por: «el tramo **más frágil** suele ser el agua: sin bomba de sobra, una falla la vuelve el más angosto».
   - **Por qué:** en el demo, el agua de La Ceiba pasada a crudo valió entre 13.600 y 15.900 bbl/d en los 13 meses. Siempre estuvo por encima de los pozos y del tren de crudo [cálculo U2]. Lo que la hace crítica es la falta de respaldo (§5.4).
   - La conclusión práctica de CHOKE-COMPLETO no cambia: las bombas de reinyección son críticas. Lo que cambia es **por qué**, y eso cambia la pantalla: ese peso le toca a «Si falla hoy», no a «Qué limita».

3. **U1 §3.2 y §10.4, el boceto del gerente: «Planta 61 % · Pozo 31 % · Exp. 8 %» (ejemplo) y «Reservorio 0» como segmento.**
   - Con el demo, octubre de La Ceiba da planta 55 %, pozos 11 % y **sin identificar 34 %** [cálculo U2].
   - **Propongo:**
     - «sin identificar» va como segmento gris discontinuo propio, porque si no, el reparto miente;
     - un tramo con 0 va solo en la leyenda, no como segmento vacío.

4. **P1 §1.2 y U1 §3.1: los rótulos «Pozo · Planta · Exportación (evacuación) · Reservorio» en las pantallas de campo.**
   - **Propongo:**
     - «En el pozo · En la planta o estación · Afuera · En el yacimiento» en las pantallas de campo y del gerente;
     - los rótulos de P1 solo en Regulatorio y en el ⓘ.
     - El título del paso, con signos de pregunta: «¿Dónde se trabó?».
   - **Por qué:**
     - «Evacuación» ya nombra en TRIM a los equipos propios, que son de la planta (§1.4).
     - «Reservorio» no es la palabra de campo.
     - El paso 4 ya se llama «¿Planeada?».

5. **P1 §2.1 se contradice en la baja tensión.**
   - **La contradicción:**
     - la tabla `REGLAS_ANH` v1 dice «`energia` por `UV` del pozo … → `pozo`»;
     - la regla `choke.topologia@1` dice que para `UV` se busca el `ChokeDeElemento` de `Pozo.alimentador`;
     - en el demo, el alimentador de todos los pozos es SE-2, que es compartido, y daría `planta`.
   - **Propongo** `choke.topologia@2`: un solo pozo caído es «pozo», como propuesta y con la pregunta de energía; varios en la ventana de cascada son «planta» (§4.4, caso 8).
   - **Cuánto pesa:** 239 bbl de La Ceiba en septiembre y 118 en octubre [demo].
   - El motor en construcción (`chokeDeCausa`, `choke.ts`) sigue la regla de topología: propone la planta y ya hace la pregunta de energía. Lo que cambia con esta propuesta es solo lo que se propone **antes** de la respuesta.

6. **P1 §1.6: `ChokeDeElemento.choke` se escribe, y vive en `Config.anh`.**
   - **Propongo:**
     - que `choke` se **derive** de `alcance` y `pozos`. Con un criterio único (CHOKE-COMPLETO §2), escribirlo a mano permitiría contradecir la regla equipo por equipo;
     - que la topología se mueva a `Config.topologia`. No es solo del reporte ANH: alimenta «Si falla hoy», la tubería y el norte. PLAN-MAESTRO §2 pone el choke en «Atribuir», no en «Reportar».
   - **Resuelto el 21-oct:** `CHOKE-CONSTRUCCION.md` movió la topología a `Config.topologia`, y `choke.ts` deriva el choke del alcance (`chokeDeAlcance`) y rechaza el que no coincide (`validarTopologia`).

7. **Configuración de hoy: la topología «no cambia cálculos».**
   - `Configuracion.tsx` rotula el desplegable «Esquema de planta» como «topología · no cambia cálculos». Sus cambios entran por `POST /api/planta/cambios` con `conector:configurar`, sin la firma de la configuración técnica (`roles.ts`).
   - **Con el choke**, la topología cambia dónde se trabó cada parada y cuánto cuesta cada falla.
   - **Propongo** que los cambios que toquen «a qué pozos sirve» pasen por la vista previa y la firma de la versión (§8.5, `config:firmar`) y que el rótulo cambie.

8. **P1 §1.3: `sup` y `jefe` confirman los seis pasos, también «Reservorio».**
   - **Propongo** que **solo `prod` y `conf` puedan poner «En el yacimiento»**, con evidencia (§4.3). `sup` y `jefe` lo piden a producción.
   - **Por qué:** es el único tramo que nunca sale de una señal (P1 §2.1). Necesita pruebas, corte de agua o presión de fondo, que no se ven desde el campo.

9. **CHOKE-COMPLETO §4 y §11: el aviso de cambio no tiene regla de estabilidad, y solo existe el empate exacto de la NSTA.**
   - **Propongo:**
     - el estado «casi iguales», con un umbral de producto;
     - y avisar solo si el cambio supera el umbral y dura {n} días (§0, principio 7; §7.2).
   - **Por qué:** sin regla, el aviso saldría 7 veces en 13 meses en La Ceiba y 5 en Guacamayo [cálculo U2].
   - El empate exacto con explicación obligatoria (NSTA §5.4) se mantiene.
   - Vale también para `serieChoke` de `choke.ts`, que hoy marca un `CambioDominante` por cada vuelta.

10. **CHOKE-COMPLETO §12: el gerente ve «la tubería de 4 barras … el estrecho resaltado».**
    - **Propongo** que el gerente vea **en qué tramo se trabó cada campo**, en barriles, y no la tubería: potenciales y holguras son detalle técnico (regla del dueño, CONTEXTO).
    - Lo único del «estrecho» que le sirve es la decisión de inversión, y le llega como una línea en F3 (§6.5): «Para producir más en La Ceiba hay que…».

11. **`producto.ts`: la pantalla Agua está en `PANTALLAS_V2`.**
    - **Propongo** encenderla para `prod`, `conf` y `adm` (§5.6).
    - **Por qué:** el norte del plan son las bombas de reinyección (PLAN-MAESTRO), y la pantalla ya existe con este propósito.

12. **P1 §5.2: las vistas de gestión cuelgan de `/vistas/anh/…`.**
    - `/vistas/anh/reparto?por=choke` es la vista que usa el gerente para el norte.
    - **Propongo** que esté también sin el prefijo `anh`, por ejemplo `/vistas/reparto?por=tramo`. El reporte ANH es valor agregado (PLAN-MAESTRO v2).
    - Es un cambio de nombre, no de contenido.

13. **El demo declara cosas que el cálculo contradice.**
    - `Campo.choke` dice «Planta» en La Ceiba y en El Palmar, y el cálculo da los pozos (§2.9).
    - La nota de La Ceiba llama al agua «el cuello de botella del campo».
    - V-101 dice «4 pozos» aguas abajo.
    - No son errores de U1 ni de P1, pero cuando se construya hay que corregirlos para que el demo no se contradiga en pantalla (§11.3).

14. **U1 §2.1: los porqués sin nombres** («TRIM lo dedujo: el equipo es solo de este pozo»).
    - **Propongo** que siempre lleven «porque» y los nombres: «porque la electrosumergible es solo de LC-11», «porque P-201B saca el agua de los 18 pozos».
    - **Por qué:** con el nombre, la persona puede comprobarlo. Sin el nombre, solo puede creerlo.

15. **CHOKE-COMPLETO §15 numera las piezas con el número de sección** desde la 8 en adelante: dice «9 (modelo de inyección…)» cuando en su tabla de §1 la inyección es la pieza 8.
    - Aquí se citan con el número de la tabla y entre paréntesis la sección (§3.3).
    - Es un detalle de edición, pero confunde al planear.

16. **CHOKE-COMPLETO §3: el potencial de la planta es «el menor de los trenes en crudo: crudo, agua y gas».**
    - Con el gas sin medir, ese mínimo lo puede decidir un número declarado (§11.3, punto 1).
    - **Propongo** que un tren sin medir quede fuera del mínimo y se vea como «sin medir».
    - Es coherente con la decisión del plan de quedarse en «solo crudo hasta entender la tolerancia diferente del gas» (PLAN-MAESTRO §3).
    - Es lo que hoy hace `potencialesDelCampo`. En La Ceiba da «a la planta le sobran 40 bbl/d» por el gas declarado, cuando sin él son 640 (§11.3, punto 1).

17. **`frontera` quiere decir dos cosas.**
    - P1 §2.1 llama `frontera` a la acometida eléctrica que **entra** (→ planta).
    - `choke.ts` llama `frontera` a la brida de salida hacia afuera (→ exportación) y trata la acometida como `compartido` (→ planta).
    - Para la pantalla da igual, porque el administrador contesta el hecho (§8.2), pero el vocabulario tiene que tener un solo dueño.
    - **Propongo** el de `choke.ts` y una nota en «Cambios al vocabulario» de P1.

18. **`NOMBRE_CHOKE.planta` = «En la planta»** (`choke.ts`).
    - El dueño pidió «en la planta o estación: afectó a varios pozos», y la ANH usa «estación» (§1.1).
    - **Propongo** «En la planta o estación» en el botón y en el selector, y «la planta» en las frases cortas («se trabó sobre todo en la planta»), como ya hace `DONDE_CHOKE`.

19. **La Zarza en la tubería.**
    - `potencialesDelCampo('zarza')` arma una tubería de crudo, el condensado, y dice «a la planta le sobran 241 bbl/d».
    - La Zarza es un campo de gas. Su limitación típica es la nominación del comprador (`planta.ts`), y el plan es «solo crudo hasta entender la tolerancia diferente del gas» (PLAN-MAESTRO §3).
    - **Propongo** el estado vacío de campo de gas (§1.5) hasta que Edinson responda. Una tubería de condensado le diría al gerente algo que no es el problema del campo.

**Lo que adopto sin cambios:**
- el criterio único de Edinson, sin opción NSTA (CHOKE-COMPLETO §2);
- la regla de origen y la de cascada (CHOKE-COMPLETO §5);
- los tanques llenos, separando el agua del crudo (P1 §3.3 y §3.4);
- la confirmación por paso (P1 §1.3);
- la paleta de U1 §9;
- la cadena de seis eslabones de U1 §2;
- y, de lo que ya construye E1:
  - `Config.topologia` y el choke derivado del alcance;
  - los nombres `ChokeAnh` y `ChokeCampo`;
  - el porqué de cada parada (`ChokeDeParada.porque`);
  - las preguntas de energía y del oleoducto que hace `chokeDeCausa`.

## Fuentes

**Primarias**
- **Circular ANH 0024 del 09-09-2026**, pp. 4 y 5 (`docs/reuniones/2026-10-19-edinson-adair/circular-anh-024-2026.pdf`). Se usaron:
  - las definiciones de Parada de Pozo, Parada Planeada y No Planeada, Diferida, Pérdida y «Componente del Sistema de Producción (Choke)», con la frase de que «se distingue técnicamente de la válvula de estrangulamiento»;
  - el numeral 2.2, con los seis pasos y el Paso 2 («cuello de botella físico o limitación funcional»);
  - los principios de Unicidad, Consistencia, Trazabilidad, **Neutralidad técnica** y Verificabilidad.
- **Imagen del árbol** (`arbol-paradas-pozo-anh.jpg`): la casilla «Componente del Sistema de Producción (Choke)» con Pozo, Planta, Exportación y Reservorio, entre el responsable y «Diferida / Pérdida».
- **Transcript del 19-oct-2026**, citado por marca de tiempo:
  - [22:34]: la «filosofía operacional»;
  - [26:48]: el transformador, «copiado del modelo choque» y las Circulares 24 y 3;
  - [31:08]: los pozos acuatosos y la «tolerancia diferente» del gas;
  - [33:45]: los colores y el equipo piloto;
  - [37:34]: «una señal apunta».

**El plan**
- `CHOKE-COMPLETO.md` (§0 a §16), `CHOKE-CONSTRUCCION.md` (tandas, agentes e interfaces compartidas) y `PLAN-MAESTRO.md` (§1 a §5).
- `U1-experiencia.md`: §0, §1, §2, §3, §9, §10 y §11.
- `P1-producto.md`: §1.2, §1.3, §1.5, §1.6, §1.7, §1.13, §1.15, §2.1, §2.10, §3.1, §3.3, §3.4 y §5.2.
- `S1-revision.md`: §3, punto 2; U1-1, U1-8 y R-E.
- `investigacion/R2-choke-y-perdidas.md`: §1 a §3.

**Código, solo lectura**
- Motor:
  - `src/entities/planta.ts`: `Chokes`, `PlantaCampo`, `trenesEnCrudo`, `CAMPO_PLANTA`;
  - `src/entities/diferido.ts`: `prediccion`, `ordenDeCierre`, `colchonDe`, `costoDeBomba`, `riesgoAhora`, `estadoCampo`, `caudalesAhora`, `paradaMedida`;
  - `src/entities/configuracion.ts`: tanques, respaldos, `PUESTA_EN_MARCHA`;
  - `src/entities/bombas.ts`: perfiles y máquinas;
  - `src/entities/pozos.ts`: `alimentador`, `CODIGO`, `NIVEL_AHORA`;
  - `src/entities/causa-senal.ts`: cascada y baja tensión → alimentador;
  - `src/entities/libro.ts`: `libro`, `lineaBase`, `historialDeEquipo`, `bandaDe`, `serieMensual`;
  - `src/entities/equipos.ts`, `campos.ts`, `roles.ts`, `tipos.ts`, `reloj.ts`;
  - `src/shared/config/producto.ts` y `src/app/pantallas.tsx`.
- El motor en construcción (E1), leído y corrido en solo lectura en su versión de las 16:02 del 21-oct: `src/entities/choke.ts` (`ChokeAnh`, `ChokeDeElemento`, `chokeDeCausa`, `potencialesDelCampo`, `brechaPorChoke`, `serieChoke`), `src/entities/datos/topologia.ts` y `TREN_AGUA` en `planta.ts`. Puede haber cambiado después.
- Pantallas: `Planta.tsx`, `Agua.tsx`, `Produccion.tsx`, `Resumen.tsx`, `widgets/resumen/PorCampo.tsx`, `widgets/resumen/ResumenDirectivo.tsx`, `Turno.tsx`, `Causa.tsx`, `Riesgo.tsx`, `Confiabilidad.tsx` y `Configuracion.tsx`.
- Tokens: `src/index.css`.
- Capturas: `docs/backend/img/prod-planta-ceiba.png`, `ger-resumen-ceiba.png`, `sup-bombas-ficha-P-201B.png` y `prod-causa.png`.

**Cómo se sacaron las cifras.** Con scripts **fuera del repositorio**, en el directorio temporal de la sesión. Cargan el motor del demo por Vite, igual que `scripts/verificar-libro.mjs`, con la caché también fuera del repositorio, y solo leen: no escriben ningún archivo del proyecto. Las cifras [cálculo U2] aplican las fórmulas de CHOKE-COMPLETO §3 con funciones que ya existen (`crudoAsignado`, `aguaDePrueba`, `ordenDeCierre`, `libro`).

**NO VERIFICADO en este documento**
- Cómo quiere la ANH la parada parcial (§4.4, caso 4; P1, pregunta 8).
- Que la ANH acepte dos filas seguidas del mismo pozo con `h_fin_paro` = `h_ini_paro` (§4.4, caso 5).
- Que el exceso de una parada planeada vaya como no planeada (§4.4, caso 6).
- Si el transformador de 2 o 3 pozos de una misma locación va al pozo o a la planta. Falta que lo diga Edinson (§8.6).
- Que «En la planta o estación» y «pozos acuatosos» sean las palabras de todos los campos. Se prueba en §10.
- El umbral de «casi iguales» (3 %) y los días para avisar (3). Son ejemplos de producto, no datos (§0, principio 7).
- La admisión de los inyectores y las capacidades de afuera. Son datos de la operadora (CHOKE-COMPLETO §16).
