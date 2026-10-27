# Los flujos que fallan hoy

**M2 · experiencia v3, §9 del encargo · 27-oct-2026.** Se recorrió la aplicación de verdad, rol por rol, con Playwright contra Vite en 5182, en escritorio (1440 × 900) y en teléfono (390 × 844, táctil). Son 41 tareas de los 11 roles y 76 recorridos medidos, con 240 capturas.

Nadie le preguntó al dueño qué le molesta: esta lista sale de lo que pasó en pantalla.

## Top 10 para el dueño

| # | Rol · tarea | Qué está mal | Roles | Cada cuánto | Toques hoy → propuesto |
|---|---|---|---|---|---|
| 1 | Los 9 roles · cambiar de pantalla en el teléfono | Cada cambio de puerta pasa por el menú ☰ | 9 | muchas veces al día | **2 → 1** |
| 2 | oper, tec, sup, jefe y conf · decir qué se dañó | La misma pregunta está en 5 bandejas, con 6 nombres, y se contesta en 3 toques | 5 | cada parada | **3 → 1** (oper y tec) · **3 → 2** (jefe y conf) |
| 3 | sup, jefe y conf · decidir los planes de P-201B | «Ver los planes» abre una pantalla sin planes; los planes están dos niveles más abajo | 3 | cada parada larga | **3 + 2 a 4 desplaz. → 1** |
| 4 | sup y oper · entregar el turno | El turno vive en tres lugares (Hoy, Identificar y Turno), y en el teléfono «Entregar turno» queda al fondo | 2 | cada turno | **2 + 2 desplaz. → 2** (teléfono) |
| 5 | sup, oper, jefe y conf · avisar a SAP | TRIM ya sabe que «SAP no lo sabe», pero el aviso está en el nivel 3, con dos nombres | 4 | cada parada | **3 → 1** |
| 6 | sup, tec, jefe y conf · la orden de K-101 | «Seguir la orden» y «Atender la orden» solo abren la orden para leerla; el técnico no puede cerrarla | 4 | cada día | **2 → 0** (1 para el técnico) |
| 7 | reg · pedir la causa que falta | Callejón: la cifra dice quién la debe, pero tocar la parada abre una ficha sin ninguna acción | 1 | cada día hasta el cierre | **imposible → 1** |
| 8 | conf · qué atacar primero | Su inicio repite P-201A tres veces, en 3.149 px (escritorio) y 6.300 px (teléfono) | 1 | cada día | **4 a 7 desplaz. → 0** |
| 9 | ger · ver quién está en ello | La ficha lo saca de «Todos mis campos» y lo deja en La Ceiba; tres botones llevan a la misma ficha | 1 | cada día | **3 → 2** (escritorio) · **5 → 2** (teléfono) |
| 10 | prod · confirmar las paradas del día | Su tarea principal no está en su inicio: abre en La planta viva y la tarea está en Hoy | 1 | cada día | **2 → 1** |

**Fuera del top 10, pero con muchos toques** (pasan una vez al mes o menos):
- reg · exportar el reporte de los 5 campos: **20 → 3** (n.º 13);
- adm · firmar la topología: **11 + 5 desplaz.**, y termina en una contradicción (n.º 16).

**WhatsApp aparece en los flujos 2, 4 y 7.** Se marca como **[WhatsApp]** y no se propone arreglo: lo borra otro agente (§6).

---

## Cómo se midió y cómo se ordenó

- **Recorrido:** un contexto nuevo del navegador por cada tarea (nada de lo que hizo una tarea se le pasa a la siguiente), con la introducción saltada (`trim.intro.<rol>`).
  - El guion está en [`herramientas/flujos-recorrer.mjs`](herramientas/flujos-recorrer.mjs) y las tareas en [`herramientas/flujos-tareas.mjs`](herramientas/flujos-tareas.mjs).
  - La medición completa, paso por paso, está en [`herramientas/flujos-medicion.json`](herramientas/flujos-medicion.json).
- **Toque:** cada clic o toque, y cada texto que hay que escribir.
- **Desplazamiento:** se cuenta cuando el botón siguiente estaba fuera de la pantalla antes de tocarlo.
  - En los pasos de solo mirar, se cuenta una vez por cada 80 % de pantalla que hay que bajar.
- **Pantallas:** cada cambio de dirección o cada hoja o ficha que se abre encima.
- **Segundos (estimados, no medidos con personas):** un modelo KLM simple:
  - 2 s para leer al abrir;
  - más 1,2 s por toque;
  - más 3 s por pantalla nueva;
  - más 1,5 s por desplazamiento;
  - más 10 s por texto escrito.
- **Impacto, para ordenar:** roles afectados × veces por semana × toques que sobran.
  - Las veces por semana: cada turno, 14; cada día, 7; cada semana, 1; cada mes, 0,25; casi nunca, 0,05.
  - Un **callejón sin salida** cuenta como 5 toques que sobran, porque la tarea se termina fuera de TRIM.
  - Las frecuencias salen de X4 §2 y §3.3 y de la ficha de cada rol. Son **supuestos para ordenar**, no datos medidos.
- **Toques «después»:** son la propuesta, no una medición. Se medirán cuando esté construida (§11).

Las capturas están en `capturas/flujos/<tarea>-<ancho>-<paso>-<qué>.jpg`.

---

## La lista completa, ordenada por impacto

### 1 · En el teléfono, cada cambio de pantalla cuesta 2 toques
**Roles:** los 9 que se ofrecen. **Frecuencia:** muchas veces al día (dato de X4 §3.1: de 3 a 4 destinos por rol). **Impacto:** 9 × 14 × 1 = **126**.

**Hoy:**
- En el escritorio, Hoy → Equipos es **1 toque** ([antes](capturas/flujos/sup-6-cambiar-de-puerta-1440-01-inicio.jpg), [después](capturas/flujos/sup-6-cambiar-de-puerta-1440-02-equipos.jpg)).
- En el teléfono son **2**: «☰ Abrir la navegación» → «Equipos» ([antes](capturas/flujos/sup-6-cambiar-de-puerta-390-01-inicio.jpg), [después](capturas/flujos/sup-6-cambiar-de-puerta-390-02-equipos.jpg)).
- Al gerente, ver el mes le cuesta 2 toques en el escritorio y 3 en el teléfono (`ger-3`).
- Al administrador, llegar a Conectores le cuesta 1 toque en el escritorio y 2 en el teléfono (`adm-3`).

**Qué está mal:** el teléfono esconde las puertas detrás de un menú, contra la regla 2 de X4 §3.1 («en el teléfono, una barra de pestañas abajo»).

**Propuesto:**
- Una barra de pestañas abajo, con las puertas que queden de [`flujos.md`](flujos.md) §2.
- Un rol con una sola pantalla no lleva barra ni ☰.

**Toques: 2 → 1** por cada cambio.

### 2 · La misma pregunta, en 5 bandejas, con 6 nombres y 3 toques
**Roles:** oper, tec, sup, jefe y conf. **Tarea:** decir qué se dañó en P-201B. **Frecuencia:** cada parada sin causa (el operador tiene 4 a la vez). **Impacto:** 14 × (2 + 2 + 1 + 1 + 0) = **84** (oper y tec ahorran 2; jefe y conf, 1; el supervisor, 0). Empata con el n.º 3 y va antes porque toca a 5 roles.

**Hoy:**

| Quién | Recorrido | Toques |
|---|---|---|
| oper · escritorio | [Hoy](capturas/flujos/oper-1-que-se-dano-1440-01-inicio.jpg) → «Contestar» ([abre la pregunta](capturas/flujos/oper-1-que-se-dano-1440-02-abrir-pregunta.jpg)) → «Sello mecánico» ([«¿qué vio?»](capturas/flujos/oper-1-que-se-dano-1440-03-parte.jpg)) → «Fuga hacia afuera» ([«Se registra en 5 s»](capturas/flujos/oper-1-que-se-dano-1440-04-registrada.jpg)) | **3** |
| oper · teléfono | [la pregunta ya abierta](capturas/flujos/oper-1-que-se-dano-390-01-inicio.jpg) → «Sello mecánico» → [«Fuga hacia afuera»](capturas/flujos/oper-1-que-se-dano-390-03-registrada.jpg) | **2** |
| tec · teléfono y escritorio | [Hoy, con «Contestar»](capturas/flujos/tec-1-que-se-dano-390-01-inicio.jpg) → [la pregunta](capturas/flujos/tec-1-que-se-dano-390-02-abrir-pregunta.jpg) → [la parte](capturas/flujos/tec-1-que-se-dano-390-03-parte.jpg) → [lo que vio](capturas/flujos/tec-1-que-se-dano-390-04-registrada.jpg). En el teléfono no se abre sola, como al operador | **3** |
| jefe y conf | [«Conseguir la causa de 3 paradas»](capturas/flujos/jefe-5-responder-yo-1440-01-inicio.jpg) → «Responder yo» → «Sello mecánico» → [«Fuga hacia afuera»](capturas/flujos/jefe-5-responder-yo-1440-04-registrada.jpg) | **3** |
| sup | Su tarjeta trae LC-21 y LC-08 (pozos): [«Responder yo»](capturas/flujos/sup-2-causa-1440-02-responder.jpg) → [una opción](capturas/flujos/sup-2-causa-1440-03-respondida.jpg) | **2** |
| sup · «Ver una por una» | Abre [Identificar](capturas/flujos/sup-7-una-por-una-1440-02-identificar.jpg), con **otro control** para lo mismo: dos chips con «5 de 8 fallas», una lista «O escoja cualquier parte…», un cuadro de texto y el botón «Contestar» | 2 a 3 |

**Los nombres de la misma acción:**
- «Contestar» (la tarjeta del operador y del técnico, e Identificar);
- «Diga qué se dañó en P-201B» (el título de la tarjeta y el nivel 3);
- «Responder yo» (sup, jefe y conf);
- «Responder en Identificar» y «Identificar antes de entregar» (Turno, [captura](capturas/flujos/sup-4-turno-subpantalla-1440-02-turno.jpg));
- «Ver una por una» (la tarjeta de confirmar).

**[WhatsApp]** La tarjeta del supervisor, del jefe y de confiabilidad trae «Ver el chat» y «se escaló a las 20:20». Identificar trae «WhatsApp · Ver el chat de Jairo Peña» ([captura](capturas/flujos/sup-7-una-por-una-1440-03-whatsapp.jpg)).

**Qué está mal:** una pregunta que debe una sola persona aparece como tarea en cinco bandejas, con seis nombres y dos controles distintos, y cuesta un toque de más por abrirla y otro por partir «la parte» de «lo que vio».

**Propuesto:**
- La tarjeta llega **abierta** a quien la debe (el operador, o el técnico si es de mantenimiento), con las 2 o 3 combinaciones más frecuentes del historial ya armadas: «Sello mecánico · fuga hacia afuera», «Sello mecánico · fuga interna», «Rodamientos…» y «Otra parte». Es la salida de P-07 de la revisión v2, que respeta ISO 14224.
- Se registra con **un toque**, con «Deshacer».
- Supervisor, jefe y confiabilidad ven **una sola línea**: «3 sin contestar · la más vieja, LC-21, 19,7 h». Con «Contestar yo» abren **la misma tarjeta**.
- Un solo nombre en todo el producto, y un solo control (se borra el de Identificar).

**Toques:**
- oper y tec: **3 → 1**;
- jefe y conf: **3 → 2**;
- sup: **2 → 2**, pero con un solo control y un solo nombre.

### 3 · «Ver los planes» lleva a una pantalla sin planes
**Roles:** sup, jefe y conf (los que tienen `planes:decidir`). **Tarea:** decidir los 3 planes de P-201B. **Frecuencia:** cada parada larga. **Impacto:** 3 × 7 × 4 = **84**.

**Hoy** (jefe, escritorio):
1. La tarjeta [«Decidir 3 planes de P-201B · simulado»](capturas/flujos/jefe-2-planes-1440-01-inicio.jpg) → «Ver los planes».
2. Abre el [nivel 3 de P-201B](capturas/flujos/jefe-2-planes-1440-02-nivel3-sin-planes.jpg). **Ahí no hay ningún plan:** se leyó la pantalla entera y la palabra «plan» no aparece.
3. «Ver el diagnóstico» abre el [nivel 4](capturas/flujos/jefe-2-planes-1440-03-nivel4.jpg).
4. Hay que bajar hasta [«Planes · lo que todavía se puede mover»](capturas/flujos/jefe-2-planes-1440-04-planes.jpg).
5. «Aceptar» ([captura](capturas/flujos/jefe-2-planes-1440-05-aceptado.jpg)).

| | Toques | Desplazamientos | Pantallas |
|---|---|---|---|
| jefe · escritorio | 3 | 1 | 3 |
| jefe · teléfono | 3 | 4 | 3 |
| sup · escritorio | 3 | 2 | 3 |
| sup · teléfono | 3 | 3 | 3 |

**Por qué pasa:**
- el destino de «Ver los planes» es «el equipo» (`entities/hoy.ts:832`);
- para un rol técnico, el equipo abre el nivel 3 (`PanelEquipo`);
- los planes solo se pintan en la ficha ejecutiva del gerente y en el diagnóstico (`widgets/bombas/Detalle.tsx:92`).

**Qué está mal:** el botón promete los planes y entrega una pantalla de señales; hay que saber que viven dos niveles más abajo.

**Propuesto:**
- La tarjeta trae los 3 planes, cada uno con «Aceptar» y «Deshacer».
- Si se quiere ver el detalle, una hoja encima de Hoy (sin cambiar de puerta).

**Toques: 3 (+1 a 4 desplazamientos) → 1.**

### 4 · El turno del supervisor vive en tres lugares
**Roles:** sup y oper (los dos tienen Hoy, Identificar y Turno en el panel). **Tarea:** entregar el turno y cerrar lo pendiente. **Frecuencia:** cada turno. **Impacto:** 2 × 14 × 2 = **56**.

**Hoy:**
- **Entregar turno, escritorio:** 2 toques, bien hecho. [Hoy](capturas/flujos/sup-3-entregar-turno-1440-01-inicio.jpg) → «Entregar turno» arma [el resumen](capturas/flujos/sup-3-entregar-turno-1440-02-resumen.jpg) → «Compartir en PDF».
- **Entregar turno, teléfono:** el botón está al **final** de Hoy, a 1.336 px: [inicio](capturas/flujos/sup-3-entregar-turno-390-01-inicio.jpg) → 2 desplazamientos → [resumen](capturas/flujos/sup-3-entregar-turno-390-02-resumen.jpg). Son 2 toques y 2 desplazamientos.
- **Lo mismo, en otra pantalla:** la subpantalla **Turno** del panel ([captura](capturas/flujos/sup-4-turno-subpantalla-1440-02-turno.jpg)) se llama «Entrega de turno», como la hoja de Hoy, pero es otra cosa:
  - trae su propio «Confirmar las 2» y «Ver una por una» («Cierre de hoy»);
  - «Responder en Identificar» e «Identificar antes de entregar»;
  - su «Exportar»;
  - la cifra proyectada «≈ 983 bbl en el turno que entra».
- **Y en una tercera:** **Identificar** ([captura](capturas/flujos/sup-7-una-por-una-1440-02-identificar.jpg)) repite las mismas paradas con otro control y con el selector «Octubre, en curso», aunque es una pantalla de ahora.

**[WhatsApp]** En el resumen de la entrega va la sección «El turno en WhatsApp». En el lateral de Hoy (sup y oper) va «El turno en WhatsApp · 8 mensajes».

**Qué está mal:** confirmar, identificar y entregar están en Hoy, en Identificar y en Turno, con nombres distintos. En el teléfono, la acción de cierre de turno queda debajo de todo.

**Propuesto:**
- **Hoy es el único lugar.** Se borran Identificar y Turno del panel (sus direcciones abren Hoy).
- En el teléfono, «Entregar turno» va fijo arriba, junto a la cifra.

**Toques:**
- teléfono: **2 + 2 desplazamientos → 2**;
- escritorio: **2 → 2**, pero se borran 2 pantallas del panel.

### 5 · Avisar a SAP: TRIM ya sabe que «SAP no lo sabe» y aun así son 3 toques
**Roles:** sup, oper, jefe y conf (`sap:aviso`). **Tarea:** avisar que P-201B está parada. **Frecuencia:** cada parada de un equipo. **Impacto:** 4 × 7 × 2 = **56**.

**Hoy** (operador, escritorio):
1. [Hoy](capturas/flujos/oper-3-aviso-sap-1440-01-inicio.jpg) → «Ver P-201B» ([nivel 3](capturas/flujos/oper-3-aviso-sap-1440-02-nivel3.jpg)).
2. «Crear aviso en SAP» despliega [«Sin aviso ni orden abiertos · parado, SAP no lo sabe»](capturas/flujos/oper-3-aviso-sap-1440-03-panel-sap.jpg).
3. «[Enviar aviso a SAP](capturas/flujos/oper-3-aviso-sap-1440-04-enviar.jpg)».

Son **3 toques y 2 pantallas.** El nivel 4 trae el mismo botón con el segundo nombre («Enviar aviso a SAP», [captura](capturas/flujos/sup-5-planes-1440-03-nivel4.jpg)).

**Qué está mal:** el sistema ya sabe que el equipo está parado y que SAP no tiene aviso, pero obliga a ir al equipo y a confirmar dos veces con dos nombres distintos.

**Propuesto:**
- En la tarjeta de la parada de Hoy, una línea «SAP no lo sabe · Avisar», con «Deshacer».
- Un solo nombre.

**Toques: 3 → 1.**

### 6 · «Seguir la orden» y «Atender la orden» solo abren la orden para leerla
**Roles:** sup, jefe y conf («Seguir la orden de K-101») y tec («Atender la orden de K-101»). **Frecuencia:** cada día que la orden siga abierta. **Impacto:** 4 × 7 × 2 = **56**.

**Hoy:**
- [La tarjeta](capturas/flujos/jefe-1-orden-k101-1440-01-inicio.jpg) ya dice: «Orden 40012056, liberada a Óscar Daza a las 09:10».
- «Ver la orden» abre el [nivel 3 de K-101](capturas/flujos/jefe-1-orden-k101-1440-02-nivel3.jpg).
- «Ver la orden en SAP» despliega la [misma orden](capturas/flujos/jefe-1-orden-k101-1440-03-orden.jpg).
- Son 2 toques para leer lo que la tarjeta ya decía.
- **El técnico** hace [lo mismo](capturas/flujos/tec-2-orden-k101-1440-03-orden.jpg): en ninguna de las dos pantallas hay cómo decir que la atendió ni qué encontró.
  - X4 §2 le da como acción «Registrar qué encontró; cerrar la orden».
  - Para él es un **callejón sin salida**.

**Qué está mal:** es una tarea en la bandeja (suma a la insignia) que no pide ninguna acción a tres roles, y al único que sí se la pide no le deja hacerla.

**Propuesto:**
- Para sup, jefe y conf, la orden va como una línea informativa: no es tarjeta ni suma a la insignia (X4 §3.3: «un aviso que solo informa no suma»).
- Para el técnico, la tarjeta trae «Diga qué encontró», con las mismas opciones de un toque del flujo 1.
- Cerrar la orden en SAP queda fuera de TRIM, como hoy.

**Toques:**
- sup, jefe y conf: **2 → 0**;
- tec: **callejón → 1**.

### 7 · Regulatorio no puede pedir la causa que falta
**Rol:** reg. **Tarea:** pedirle la causa de LC-21 a quien la debe. **Frecuencia:** cada día, hasta el cierre del mes. **Impacto:** 1 × 7 × 5 = **35** (callejón).

**Hoy:**
- [Su inicio](capturas/flujos/reg-1-pedir-causa-1440-01-inicio.jpg) ya responde bien:
  - «2 paradas sin causa»;
  - «Las contesta el operador de campo mañana antes de las 07:00»;
  - la fila «LC-21 · faltan todos los pasos · Lo debe el operador de campo».
- Al tocar LC-21 se abre [la ficha del pozo](capturas/flujos/reg-1-pedir-causa-1440-02-ficha-sin-accion.jpg) ([teléfono](capturas/flujos/reg-1-pedir-causa-390-02-ficha-sin-accion.jpg)). Sus únicos botones: «Exportar la ficha en PDF», «Expandir» y dos «Cerrar».
- X4 §2 le da como acción «Pedir lo que falta».

**[WhatsApp]** Hoy, quien pedía y escalaba era el recordatorio de WhatsApp («04:22 recordatorio → 05:52 escalado», en el Hoy del supervisor).

**Qué está mal:** la cifra le dice quién debe la causa, pero tocarla no deja hacer nada: la tarea se termina por fuera de TRIM.

**Propuesto:**
- Cada fila lleva «Pedir». La parada sube a la primera tarjeta del Hoy de quien la debe, con su insignia, y queda «pedida a las hh:mm por Iván Salas» (trazabilidad, D1).
- La ficha del pozo sigue a un toque, para la evidencia.

**Toques: imposible → 1.**

### 8 · Confiabilidad: su inicio repite P-201A tres veces
**Rol:** conf. **Tarea:** qué atacar primero. **Frecuencia:** cada día. **Impacto:** 1 × 7 × 4 = **28** (escritorio); con los 7 desplazamientos del teléfono serían 49.

**Hoy:** lo que importa ya está arriba, y abrir P-201A es **1 toque** ([captura](capturas/flujos/conf-1-atacar-primero-1440-01-inicio.jpg)). Arriba dice: «Si falla hoy 3.059 bbl/d · Ataque primero P-201A y P-201C… Ahí va el próximo instrumento».

Pero la página sigue: P-201A aparece **tres veces** en la misma pantalla:
1. arriba;
2. en la lista de 28 equipos, [8.ª fila](capturas/flujos/conf-3-repetido-1440-02-segunda-vez.jpg);
3. en el bloque de abajo, con «Qué está en riesgo», «Por qué», «Equipos que avisan» y otra vez [«Si falla hoy» con su «ver 13 más»](capturas/flujos/conf-3-repetido-390-03-tercera-vez.jpg).

La página mide **3.149 px** en el escritorio (4 desplazamientos hasta el final) y unos **6.300 px** en el teléfono (7 desplazamientos). El bloque de abajo es el Riesgo de antes, fundido debajo (K1 · P-10, `roles.ts`).

**Qué está mal:**
- El mismo dato está tres veces, con dos órdenes distintos: por condición en la lista, por «Si falla hoy» arriba y abajo.
- «Ahí va el próximo instrumento» es una decisión sin botón. X4 §2 da como acción «Escoger dónde va el próximo instrumento».

**Propuesto:**
- Se borra el bloque de abajo.
- La lista va ordenada por «Si falla hoy», como pide X4 §3.2, y los 3 primeros quedan como sus primeras filas, no como un bloque aparte.
- La acción del instrumento queda para la escalera del rol (§5.1), no se inventa aquí.

**Desplazamientos:** **4 → 0** en el escritorio y **7 → 1** en el teléfono, para ver todo lo que decide.

### 9 · Gerente: la ficha lo saca de «Todos mis campos»
**Rol:** ger. **Tarea:** ver dónde se trabó y quién está en ello, y volver a sus 5 campos. **Frecuencia:** cada día. **Impacto:** 1 × 7 × 1 = **7** en el escritorio (14 en el teléfono).

**Hoy, escritorio:**
1. [«Todos mis campos»](capturas/flujos/ger-1-quien-esta-en-ello-1440-01-inicio.jpg) → «Ver qué se está haciendo» abre la ficha de P-201B, **pero la dirección pasa a La Ceiba** (`#/ger/planta-viva/ceiba/curso/P-201B`, [captura](capturas/flujos/ger-1-quien-esta-en-ello-1440-02-ficha.jpg)).
2. Al cerrar la ficha queda en [**La Ceiba**](capturas/flujos/ger-1-quien-esta-en-ello-1440-03-cerrar-ficha.jpg), no en sus 5 campos.
3. Volver cuesta otro toque («Todos mis campos» en las migas).

Son **3 toques.**

**Hoy, teléfono:** en «Todos mis campos» **no está** «Ver qué se está haciendo» ([captura](capturas/flujos/ger-1-quien-esta-en-ello-390-01-inicio.jpg)). Hay que abrir La Ceiba, bajar, tocar «Ver qué se está haciendo» y cerrar ([la serie](capturas/flujos/ger-1-quien-esta-en-ello-390-04-cerrar-ficha.jpg)). Más volver, son **4 toques y 1 desplazamiento.**

**Además, lo repetido:** «Ver qué se está haciendo», «Ver el plan ›» (en el héroe) y «Ver el plan ›» (en el lateral) abren **la misma ficha** de P-201B (`widgets/plantaviva/acciones.ts`: `abrir` llama a `setCampo` cuando el equipo es de otro campo o el alcance no es «campo»).

**Qué está mal:** abrir un detalle cambia el campo en silencio, y hay tres botones que llevan al mismo lugar.

**Propuesto:**
- La ficha se abre **encima** de «Todos mis campos» y, al cerrarla, vuelve ahí.
- Un solo botón por destino.
- En el teléfono, el mismo botón que en el escritorio.

**Toques:**
- escritorio: **3 → 2** (abrir y cerrar);
- teléfono: **4 + 1 desplazamiento → 2**.

### 10 · Producción: su tarea principal no está en su inicio
**Rol:** prod. **Tarea:** confirmar las paradas del día en lote. **Frecuencia:** cada día. **Impacto:** 1 × 7 × 1 = **7**. Desempata sobre el n.º 11 porque es la tarea principal del rol (X4 §2).

**Hoy:**
1. Abre en [La planta viva](capturas/flujos/prod-1-confirmar-lote-1440-01-inicio.jpg). La pantalla le muestra «Ver Hoy», y el panel la insignia «Hoy 2».
2. «Ver Hoy» → [Hoy](capturas/flujos/prod-1-confirmar-lote-1440-02-hoy.jpg).
3. «Confirmar las 2» ([captura](capturas/flujos/prod-1-confirmar-lote-1440-03-confirmadas.jpg)).

Son **2 toques** en el escritorio, y 2 más 1 desplazamiento en el teléfono.

**Además:** el «Pedir la causa ›» del dibujo (LC-21) la lleva a Identificar, otra puerta.

**Qué está mal:** su inicio responde «qué limita», pero lo que tiene que hacer hoy está en otra puerta.

**Propuesto:** cuando tiene algo por confirmar, la tarjeta «Confirmar 2 paradas iguales · Confirmar las 2» va arriba de su La planta viva. Cuando no tiene nada, no va.

**Toques: 2 → 1.**

---

### 11 · Jefe: su cifra no lleva a nada y «Ver P-201A y P-201C» abre otra lista
**Rol:** jefe. **Frecuencia:** cada día. **Impacto:** 1 × 7 × 1 = **7**.

**Hoy:**
- **Su cifra no lleva a ningún lado.** «7,7 de 8,1 días son espera» ([captura](capturas/flujos/jefe-3-espera-1440-01-inicio.jpg)) solo tiene una ⓘ. Su detalle («Reparación activa y espera») está en Resultados → [Confiabilidad](capturas/flujos/jefe-3-espera-1440-04-espera.jpg): 2 toques, cambiando de puerta y con el período «Octubre, en curso».
- **«Ver P-201A y P-201C» solo abre otra lista.** El aviso «Ojo: no intervenir hoy» lleva a [la lista de Equipos](capturas/flujos/jefe-4-no-intervenir-1440-02-lista.jpg), filtrada y con el mismo «Ojo» repetido arriba. Hay que tocar otra vez para ver [P-201A](capturas/flujos/jefe-4-no-intervenir-1440-03-p201a.jpg). Son 2 toques (más 2 desplazamientos en el teléfono) para un aviso que dice **no** hacer nada.

**Qué está mal:** la cifra del jefe no lleva a ninguna acción, y el aviso que pide no actuar es un botón que abre una lista.

**Propuesto:**
- Tocar la cifra abre su detalle en una hoja (**2 → 1**).
- «Ojo: no intervenir hoy» queda como línea informativa, sin botón (**2 → 0**).

### 12 · «Después» y Resultados dicen lo mismo, con dos selectores de período
**Roles:** ger, prod, jefe, conf y reg (los que tienen las dos). **Frecuencia:** cada semana. **Impacto:** 5 × 1 × 1 = **5**.

**Hoy (gerente):**
- «Después» en La planta viva ([captura](capturas/flujos/ger-3-el-mes-1440-02-despues.jpg)) dice «2.376 barriles no se produjeron», con su propio selector «octubre, en curso ▾».
- Resultados ([captura](capturas/flujos/ger-3-el-mes-1440-03-resultados.jpg)) dice «2.376 barriles no se produjeron en sus 5 campos», con el selector de la cabecera.
- Son el mismo número, con dos nombres y dos selectores de período.

**Qué está mal:** es lo repetido con otro nombre, y el período vive en dos lugares, contra la regla 8 de X4 §3.1.

**Propuesto:** se queda uno. O «Después» es un enlace a Resultados, o Resultados se borra como puerta y «Después» lo absorbe. Lo decide el dueño con [`flujos.md`](flujos.md) §2. **Toques: igual; una pantalla menos.**

### 13 · Regulatorio: exportar el mes de sus 5 campos son 20 toques
**Rol:** reg. **Frecuencia:** cada mes. **Impacto:** 1 × 0,25 × 17 = **4**.

**Hoy:**
- Con «Todos mis campos», el Reporte dice [«elija un campo»](capturas/flujos/reg-3-todos-los-campos-1440-02-elija-un-campo.jpg): no hay una vista de los 5.
- Hay que ir campo por campo:
  1. período → «Septiembre · cerrado» → «Exportar» → «CSV para la ANH»;
  2. luego, 4 veces: el selector de campo → el campo → «Exportar» → «CSV para la ANH» ([la serie](capturas/flujos/reg-4-exportar-5-campos-1440-07-campo.jpg)).
- Son **20 toques, 5 pantallas y unos 38 s**. El período sí se conserva al cambiar de campo.

**Qué está mal:** el regulatorio responde por los 5 campos, pero la pantalla solo deja ver y exportar uno a la vez.

**Propuesto:**
- El Reporte con «Todos mis campos» muestra una fila por campo («Se puede publicar» o «Faltan 3 · 1.492 bbl»).
- «Exportar los 5» saca un archivo por campo, sin cambiar el formato C024 (el reporte a la ANH no cambia).

**Toques: 20 → 3.**

### 14 · Producción: cargar la asignación es bajar dos pantallas en otra puerta, con una trampa
**Rol:** prod. **Frecuencia:** cada mes. **Impacto:** 1 × 0,25 × 6 = **1,5**.

**Hoy:**
1. [La planta viva](capturas/flujos/prod-2-asignacion-1440-01-inicio.jpg) → «Ver Hoy» → «[Cargar la asignación de septiembre · Cargarla](capturas/flujos/prod-2-asignacion-1440-02-hoy.jpg)».
2. Abre **arriba** de [Producción contra plan](capturas/flujos/prod-2-asignacion-1440-03-produccion.jpg): otra puerta (Resultados) y el período en octubre.
3. El formulario está al final, a unos 2.400 px ([captura](capturas/flujos/prod-2-asignacion-1440-04-formulario.jpg)). Son 3 desplazamientos en el escritorio y 5 en el teléfono.
4. Escribir el motivo ([captura](capturas/flujos/prod-2-asignacion-1440-05-motivo.jpg)).
5. «Subir un CSV» y escoger el archivo (no se ejecutó, para no cargar datos).

Son **5 toques y 3 a 5 desplazamientos.**

**La trampa:**
- El motivo es obligatorio y tiene que ir **antes** del archivo, porque «un CSV subido se carga en seguida y reemplaza la oficial del mes» (comentario en `widgets/produccion/AsignacionOficial.tsx`).
- El botón del texto pegado se llama «Cotejar», pero **carga**: llama a `cargar(...)` (líneas 66 y 127).

**Qué está mal:** la tarjeta lleva a la cabeza de otra pantalla, y el formulario obliga a adivinar el orden y a confiar en un nombre que no dice lo que hace.

**Propuesto:**
- «Cargarla» abre una hoja con el campo y el mes ya puestos, y el motivo prellenado («asignación de septiembre reportada a la ANH») y editable.
- «Subir un CSV», y el botón dice «Cargar».

**Toques: 5 + 3 desplazamientos → 2.**

### 15 · Gerente: firmar las metas está en el menú de la persona y pide un campo que no hace falta
**Rol:** ger. **Frecuencia:** cada mes. **Impacto:** 1 × 0,25 × 4 = **1**.

**Hoy:**
1. [Inicio](capturas/flujos/ger-2-firmar-metas-1440-01-inicio.jpg) → [el menú de la persona](capturas/flujos/ger-2-firmar-metas-1440-02-menu.jpg) → «Metas y accesos».
2. Sale [«Configurar · elija un campo»](capturas/flujos/ger-2-firmar-metas-1440-03-elija-un-campo.jpg).
3. Al escoger La Ceiba, el formulario muestra las metas **de los 5 campos** ([captura](capturas/flujos/ger-2-firmar-metas-1440-04-la-ceiba.jpg)): escoger un campo no hacía falta.
4. Bajar hasta [«Firmar la versión»](capturas/flujos/ger-2-firmar-metas-1440-05-firmar.jpg).
5. Escribir el motivo y firmar.

Son **5 toques y 1 desplazamiento** (2 en el teléfono).

**Qué está mal:** la decisión mensual del gerente vive en un menú que nadie abre, y obliga a escoger un campo que el formulario no usa.

**Propuesto:** cuando hay metas por firmar, una tarjeta «Para usted · Firmar las metas de noviembre» arriba de su La planta viva (X4 §3.2). Abre una hoja con los 5 campos y «Firmar». **Toques: 5 + 1 desplazamiento → 2.**

### 16 · Administrador: firmar la topología son 11 toques y termina en una contradicción
**Rol:** adm. **Frecuencia:** casi nunca (al implementar un campo). **Impacto:** 1 × 0,05 × 13 = **0,65**, pero **termina en un callejón**.

**Hoy:**
1. [Estado](capturas/flujos/adm-2-firmar-topologia-1440-01-inicio.jpg): «A qué pozos sirve cada equipo · falta».
2. Lleva a la [Filosofía, paso 1](capturas/flujos/adm-2-firmar-topologia-1440-02-paso1.jpg): «Sin responder 30».
3. Hay **8** botones «Aceptar lo que TRIM dedujo», uno por grupo, repartidos en unos 2.100 px. Se tocaron los 8 ([el último](capturas/flujos/adm-2-firmar-topologia-1440-10-aceptar-grupo.jpg)).
4. Paso 3: [«Corrija antes de firmar: un equipo queda sin contestar»](capturas/flujos/adm-2-firmar-topologia-1440-11-paso3-bloqueado.jpg).
5. «Ver lo que falta» lleva a [**«Sin responder 0 · Nada en "Sin responder"»**](capturas/flujos/adm-2-firmar-topologia-1440-12-sin-responder-0.jpg). Lo que falta está en otra pestaña, «Propuestas de TRIM 1».

Son **11 toques y 5 desplazamientos**, y todavía no se puede firmar.

**Qué está mal:**
- Se confirma 8 veces lo que TRIM ya dedujo.
- El enlace «Ver lo que falta» lleva a una lista que dice que no falta nada.

**Propuesto:**
- Un solo «Aceptar todo lo que TRIM dedujo (36 equipos)».
- «Lo que falta» lleva **al equipo** que falta.
- El motivo y «Firmar».

**Toques: 11 + 5 desplazamientos (sin terminar) → 3 + lo que falte de verdad.**

### 17 · Planeadora y abastecimiento: sus tareas no se pueden hacer
**Roles:** plan y cont (apagados en el MVP). **Las 6 tareas de X4:**
- plan: qué repuesto pido, qué programo y si alcanza el repuesto;
- cont: a quién le toca la parada, el expediente y las paradas externas.

**Hoy:** todas abren la vista de **producción**. Ahora con aviso: «El rol "Planeadora de mantenimiento" todavía no está en esta versión: le mostramos ingeniera de producción.» ([plan](capturas/flujos/plan-1-repuesto-1440-01-abre-produccion.jpg), [cont](capturas/flujos/cont-1-evidencia-1440-01-abre-produccion.jpg)). Lo de la planeadora existe a pedazos en otros roles:
- el repuesto, en el nivel 3 de P-201B: «Kit de sello mecánico 0 en bodega · llega 1 el 9 de oct»;
- «Ojo: no intervenir», en el jefe.

**Qué está mal:** son dos roles declarados, con direcciones que no llevan a su trabajo.

**Propuesto:** no es de flujo. El dueño decide si siguen apagados o se borran (§5 del encargo). Mientras tanto, se quedan sin puertas ([`flujos.md`](flujos.md) §2).

---

## Menores (no cambian el orden, pero se arreglan de paso)

- **conf · «¿Le creo al vigía?» cambia de puerta.**
  - «Ver el detalle» ([captura](capturas/flujos/conf-2-vigia-1440-02-confiabilidad.jpg)) lo lleva a Resultados → Confiabilidad, con período y «Exportar», desde una pantalla de ahora.
  - Propuesto: una hoja encima de Equipos. **1 → 1, sin cambio de contexto.**
- **adm · los tags sin equipo están al final de Conectores.**
  - «Aplicar las 3» queda a unos 1.240 px en el escritorio y a más de 2.000 px en el teléfono ([captura](capturas/flujos/adm-3-tags-390-03-tags.jpg)), y no aparece en el Estado de la configuración.
  - Propuesto: el paso «Tags sin equipo · 3» en Estado, con «Aplicar las 3». **2 + 1 desplazamiento → 1.**
  - Nota: «Aplicar las 3» escribe en el simulador (`simulador-api/datos/trim.db`). El recorrido final no lo toca.
- **ger · Equipos repite Durante.**
  - La puerta Equipos del gerente es «Ahora: lo que está parado o avisa · 16 equipos», con P-201B y MN-41 primero.
  - Es lo mismo que «Durante» y «Diferido por equipo» de su La planta viva. Va a la cuenta de puertas ([`flujos.md`](flujos.md) §2).

## Lo que funciona y no se toca

| Rol · tarea | Toques (escritorio / teléfono) | Por qué está bien |
|---|---|---|
| sup · confirmar 2 paradas iguales | 1 / 1 | Un toque, «Deshacer» y la insignia baja ([captura](capturas/flujos/sup-1-confirmar-lote-1440-02-confirmadas.jpg)) |
| sup · conseguir la causa de LC-21 | 2 / 2 | Una opción por toque, en la tarjeta ([captura](capturas/flujos/sup-2-causa-1440-03-respondida.jpg)) |
| oper · por qué paró LC-21 | 2 / — | Una opción (con la tarjeta abierta, sería 1) |
| conf · abrir P-201A | 1 / 1 | El primero de «Si falla hoy» está arriba, sin desplazarse |
| prod · qué limita y «Si falla hoy» | 0 + 1 / 0 + 1 | La frase lo dice, y la lista abre el equipo ([captura](capturas/flujos/prod-3-si-falla-hoy-1440-01-inicio.jpg)) |
| reg · ¿se puede publicar? | 0 / 0 | «2 paradas sin causa», quién las debe y para cuándo |
| adm · qué falta en La Ceiba | 0 / 0 | «3 de 6 pasos» y la lista de pasos ([captura](capturas/flujos/adm-1-que-falta-1440-01-inicio.jpg)) |
| tec · ver P-201B | 1 / 1 | Directo al nivel 3 |
| Período al cambiar de campo o de puerta | — | Se conserva (`…/cerrado` viaja en la dirección) |
| Responder | — | «Se registra en 5 s · Deshacer», en vez de confirmar dos veces |

## Todas las tareas medidas

| Tarea | 1440: toques · desplaz. · pantallas · s | 390: toques · desplaz. · pantallas · s |
|---|---|---|
| ger-1 quién está en ello | 2 · 0 · 3 · 10 (+1 para volver) | 3 · 1 · 4 · 16 (+1 para volver) |
| ger-2 firmar metas | 3 · 1 · 3 · 13 (+2: motivo y firmar) | 3 · 2 · 3 · 15 (+2) |
| ger-3 el mes | 2 · 0 · 3 · 10 | 3 · 0 · 3 · 12 |
| ger-4 campo y equipo | 2 · 0 · 3 · 10 | 2 · 1 · 3 · 12 |
| prod-1 confirmar en lote | 2 · 0 · 2 · 7 | 2 · 1 · 2 · 9 |
| prod-2 asignación (hasta el motivo) | 3 · 3 · 3 · 26 (+2: subir y archivo) | 3 · 5 · 3 · 29 (+2) |
| prod-3 «Si falla hoy» | 1 · 0 · 2 · 6 | 1 · 1 · 2 · 8 |
| sup-1 confirmar | 1 · 0 · 1 · 3 | 1 · 0 · 1 · 3 |
| sup-2 causa de LC-21 | 2 · 0 · 1 · 4 | 2 · 1 · 1 · 6 |
| sup-3 entregar turno | 2 · 0 · 1 · 4 | 2 · 2 · 2 · 10 |
| sup-4 subpantalla Turno | 1 · 0 · 2 · 6 | — |
| sup-5 planes | 3 · 2 · 3 · 15 | 3 · 3 · 3 · 16 |
| sup-6 cambiar de puerta | 1 · 0 · 2 · 6 | 2 · 0 · 2 · 7 |
| sup-7 una por una (Identificar) | 1 · 0 · 2 · 6 | 1 · 1 · 2 · 8 |
| oper-1 qué se dañó | 3 · 0 · 1 · 6 | 2 · 0 · 1 · 4 |
| oper-2 por qué paró LC-21 | 2 · 0 · 1 · 4 | — |
| oper-3 aviso a SAP | 3 · 0 · 2 · 8 | — |
| tec-1 qué se dañó | 3 · 0 · 1 · 6 | 3 · 0 · 1 · 6 |
| tec-2 orden de K-101 | 2 · 0 · 2 · 7 (callejón) | 2 · 1 · 2 · 9 |
| tec-3 ver el equipo | 1 · 0 · 2 · 6 | 1 · 0 · 2 · 6 |
| jefe-1 orden de K-101 | 2 · 0 · 2 · 7 | 2 · 0 · 2 · 7 |
| jefe-2 planes | 3 · 1 · 3 · 13 | 3 · 4 · 3 · 18 |
| jefe-3 de dónde sale la espera | 2 · 0 · 3 · 10 | — |
| jefe-4 no intervenir | 2 · 0 · 3 · 10 | 2 · 2 · 3 · 13 |
| jefe-5 responder él | 3 · 0 · 1 · 6 | 3 · 0 · 1 · 6 |
| conf-1 atacar primero | 1 · 0 · 2 · 6 | 1 · 0 · 2 · 6 |
| conf-2 vigía | 1 · 0 · 2 · 6 | 1 · 0 · 2 · 6 |
| conf-3 bajar su inicio | 0 · 4 · 1 · 8 | 0 · 7 · 1 · 13 |
| reg-1 pedir la causa | 1 · 0 · 2 · 6 (callejón) | 1 · 0 · 2 · 6 (callejón) |
| reg-2 exportar septiembre (1 campo) | 4 · 0 · 1 · 7 | 4 · 0 · 1 · 7 |
| reg-3 los 5 campos | 1 · 0 · 2 · 6 («elija un campo») | 1 · 0 · 2 · 6 |
| reg-4 exportar los 5 campos | 20 · 0 · 5 · 38 | — |
| adm-1 qué falta | 0 · 0 · 1 · 2 | 0 · 0 · 1 · 2 |
| adm-2 firmar topología | 11 · 5 · 2 · 26 (sin terminar) | — |
| adm-3 tags | 2 · 1 · 2 · 9 | 3 · 2 · 2 · 12 |
| plan-1, plan-2, plan-3 | abren producción | abren producción |
| cont-1, cont-2, cont-3 | abren producción | abren producción |

Notas:
- «—» quiere decir que esa tarea no se recorrió en ese ancho:
  - oper-2 y oper-3 en el teléfono (el operador ve la pregunta abierta, ya medida en oper-1);
  - sup-4, jefe-3, reg-4 y adm-2, que son de escritorio.
- oper-3 se midió en 2 toques hasta ver «Enviar aviso a SAP». No se envió, para no escribir; el tercer toque se suma en la tabla.
