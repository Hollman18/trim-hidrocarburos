# Prompt · Simplificar TRIM Hidrocarburos: lo que agrega valor a cada rol, nada más

> Para pegar a una IA o a un equipo de agentes que trabaje sobre el repositorio `/Users/hollman/trim-hidrocarburos`.

---

## 0. La misión, en una frase

Dejar en cada pantalla de cada rol **solo lo que agrega valor**, dicho con **números claros** y flujos de **pocos toques**, con un diseño **contemporáneo y minimalista** y gráficos **tipo SCADA que se sientan profesionales**. **Borrar todo lo demás**, empezando por el envío de WhatsApp.

La regla del dueño, citando a Elon Musk: *«lo peor que puede hacer un ingeniero es automatizar procesos que no agregan valor»*.

**El punto de partida es CERO, no lo que existe hoy, y la meta es LO NECESARIO, no lo mínimo.** El dueño lo precisó así (27-oct): *«no es que sea lo mínimo posible, sino que sea lo necesario posible para que agregue tanto valor al problema que nosotros estamos resolviendo… con los necesarios»*. Antes había dicho: *«que verdaderamente agregue valor a cada uno de los roles, que ellos puedan usar, tener, hacer. Y a partir de ahí vamos creciendo. Eso quiero que lo veamos.»*

Por eso, primero se define **lo necesario de cada rol** desde una hoja en blanco: qué **ve**, qué **tiene**, qué **hace** y **cuándo**.
- **Lo necesario** es todo lo que el rol requiere para resolver su problema con mucho valor: bajar los barriles diferidos y perdidos, decidir a tiempo y cumplir.
- No sobra nada que no agregue valor, y no falta nada que sí lo agregue. Si son 5 números necesarios, son 5, cada uno con su porqué. Si es 1, es 1.

El dueño lo revisa y lo aprueba. Después se crece escalón por escalón, y cada escalón tiene que demostrar su valor (§5.1).

---

## 1. Lo que pidió el dueño (Hollman), en sus palabras, y cómo se interpreta

| Lo que dijo | Cómo se aplica |
|---|---|
| «Cuando te hablaba de una experiencia similar a la de Nubank… no que sea igualita, sino que sea así de simple, fácil de entender» | **Nubank es una vara de sencillez, no un modelo para copiar.** Nada de su estilo, color ni componentes por ser de Nubank. La pregunta es siempre: ¿lo entiende cualquiera en segundos? |
| «Lo más simple que necesita cada una de las pantallas, cada uno de los roles, del directivo hasta abajo, hasta el de mantenimiento» | Una **ficha de valor por rol** (§5): su pregunta, su decisión, sus pocos números y su acción. Lo que no sirve a eso se borra o se va a un toque. |
| «Que eliminemos lo de WhatsApp, lo que es el envío de WhatsApp» | **Se borra todo el canal de WhatsApp** (§6): envío, chat, recordatorios, escalamientos por WhatsApp, el teléfono simulado y la plantilla de Meta. Lo que tenga valor se resuelve dentro de TRIM, sin canal externo. |
| «Que sea más tipo número» | **Primero el número, después las palabras.** Cada vista abre con su número, su unidad y un rótulo de 2 a 4 palabras. Las frases largas salen de la primera capa. |
| «Tipo SCADA industrial, pero a la vez fácil de usar» | **ISA-101 de alto desempeño, con la claridad de una buena app de consumo:** gris lo normal, color solo para lo anormal, indicadores y tendencias profesionales, y flujos de una sola acción principal. |
| «Cualquier otra aplicación o software que sea simple… flujos muy simples» | Se toman como referencia de **flujo** (no de estética) apps de pocos pasos: Linear, Stripe, Revolut, la app de Tesla (número + acción) y Apple Salud (números grandes, tendencia y detalle a un toque). Hay que justificar qué se toma de cada una. |
| «Eliminar cosas que no agreguen valor y dejar lo que agrega mucho valor por cada rol, según la investigación y todo el conocimiento que tengas acá» | El valor se decide con la **evidencia del repositorio** (§2), no con gustos. |
| «Ese color azul no me gusta. Tiene que ser algo muy contemporáneo, minimalista» | **El índigo #142d88 sale**, del panel, de los botones y de todo. Se proponen **tres direcciones nuevas** y el dueño escoge una (§7). |
| «Que los gráficos del tipo SCADA se vean, se sientan muy profesionales» | Un **kit SCADA propio** (§8), dibujado con el rigor de AVEVA, Honeywell, Ignition o Emerson en su versión de alto desempeño. Nada de aspecto de caricatura ni de tablero genérico. |
| «Hay cosas ahí que no me gustan en el flujo» | Se revisa **cada flujo** (§9) y se le pregunta al dueño cuáles le molestan. Lo que diga entra primero en la lista. |
| «Si tenemos que rediseñarlo, rediseñamos, pero que sea un buen flujo» | Se puede cambiar todo lo de la pantalla, con la única condición de que el flujo nuevo sea medible y demostrablemente mejor (§11). |

---

## 2. El producto y la evidencia (léelo antes de opinar)

- **El norte:** subir la productividad bajando los barriles **diferidos** (se dejan de producir y se recuperan después) y **perdidos** (salieron y no se vendieron), monitoreando y prediciendo las bombas críticas (electrosumergibles, de agua y multifásicas). Son campos colombianos con 92–97 % de agua. El reporte a la ANH (Circular 024) es valor agregado y **es obligatorio**: no se borra.
- **Stack:**
  - React 19, Vite 8, TypeScript estricto, Tailwind v4, zustand y lucide-react;
  - SVG propio, sin librerías de gráficos;
  - CSP estricta, sin `eval`.
- **Arquitectura:**
  - el motor en `src/entities`, que calcula;
  - la costura en `src/shared/api`;
  - las pantallas en `src/pages` y `src/widgets`, que pintan;
  - el contrato para un backend en `contrato.ts` y `CONTRATO.md`;
  - la referencia en `referencia/`;
  - el SQL en `docs/backend/sql/`.
- **Los 11 roles** (`src/entities/roles.ts`): ger (gerente de activo), prod (ingeniera de producción), sup (supervisor), oper (operador de campo), jefe (jefe de mantenimiento), conf (confiabilidad), plan (planeadora), tec (técnico de mantenimiento), cont (abastecimiento), reg (regulatorio) y adm (administrador).
- **Las puertas de hoy:** Hoy · La planta viva · Equipos · Resultados, más Reporte, Configurar y Paradas.
- **La evidencia que hay que leer:**
  1. **la reunión con los expertos:** `docs/reuniones/2026-10-19-edinson-adair/transcript.txt`. Edinson Maestre, que escribió la Circular 024, pide el árbol, las pérdidas y las métricas de confiabilidad. Adair pide los colores SCADA y el piloto de bombas;
  2. **la arquitectura por rol:** `docs/experiencia-v2/X4-arquitectura-roles.md`, con la pregunta y la acción de cada rol (§2), el inicio (§3.4) y el mapa de cada panel (§3.7);
  3. **la norma:** `docs/experiencia-v2/X2-norma-hmi.md` (ISA-101, ISA-18.2 y las 44 comprobaciones);
  4. **los referentes:** `docs/experiencia-v2/X1-identidad-referentes.md` (Nubank, Linear, Stripe, Vercel, Ignition, AVEVA, Honeywell, Emerson, Siemens, Tractian, Augury y Cognite);
  5. **la última revisión:** `docs/experiencia-v2/R-revision/` (`qa-final.md`, `medicion.md`, `glosario.md` y `roles/<rol>.md`). Ahí está lo que se midió: hoy el producto tiene unas 127.000 palabras en sus páginas, Equipos con todos los campos tiene 3.850 y la meta de menos texto **no se cumplió**;
  6. **el plan del producto:** `docs/plan-circular-24/PLAN-MAESTRO.md`, `CHOKE-COMPLETO.md` y `CORRECCIONES-QA.md` (decisiones D1–D7);
  7. **el documento comercial:** `docs/backend/01-propuesta-de-valor.md` (qué se le promete al cliente).
- **Dónde verlo:**
  - `npx vite --port <518x> --strictPort`, con rutas `#/<rol>/<pantalla>/<campo>/curso`;
  - para saltar la introducción: `localStorage.setItem('trim.intro.<rol>','1')`;
  - las rutas del auditor están en `e2e/auditoria/rutas.ts`.

---

## 3. Reglas que no se rompen

1. **Nada inventado.** Las cifras salen del motor. Si un dato no existe, se dice «sin dato».
2. **El motor calcula y la pantalla pinta** (oxlint lo exige).
3. **Diferido no es pérdida.** Nunca se suman ni se dibujan igual.
4. **Lo obligatorio no se borra:**
   - el reporte a la ANH, con sus 6 pasos y sus salidas C024-2026 y DICC-V3.2;
   - la trazabilidad de quién dijo qué (D1: por paso, solo por inserción);
   - nada de texto libre a la ANH (D2);
   - la seguridad (capacidades por rol).
5. **Borrar sí se puede.** A diferencia de la revisión anterior, aquí **una función se puede borrar** si el análisis de valor (§4) lo justifica y el dueño aprueba la lista de lo que se borra (puerta de §10). Cada borrado queda escrito: qué era, por qué no agregaba valor y quién lo pidió originalmente.
6. **Pruebas:**
   - cada cambio lleva su prueba, que falla sin el cambio;
   - lo borrado se borra también de las pruebas, el contrato, el SQL, la referencia y la documentación, **sin dejar huérfanos**.
7. **Entorno:**
   - NUNCA `pkill` ni matar procesos por nombre;
   - no tocar los puertos 4173 (el demo del dueño), 5173 ni 4199;
   - no `npm i`;
   - no commits (los hace el coordinador);
   - nunca editar mientras corren e2e.
8. **Español de Colombia, de usted, con palabras de campo.**
9. **AÑADIR, NO EDITAR: hay un desarrollador de backend trabajando con este código** (§3.1).
10. **EL CHOKE VA SÍ O SÍ** (el dueño, 27-oct). El modelo choke (SPE-36848; la ANH lo adoptó en las Circulares 003 y 024) es internacional y es la arquitectura con la que se identifican los problemas. De cada falla sale su tramo (yacimiento, pozos, planta o salida) y, en el árbol de 6 pasos, si el barril es **diferido o perdido**. Ninguna simplificación lo quita: cada rol lo ve en la medida que su trabajo pide (`necesario-por-rol.md` §0b). El problema que se resuelve es uno: barriles diferidos y barriles perdidos.

### 3.1 La regla del backend: al lado, nunca encima

El dueño lo explicó así: *«la idea es añadir, no editar… que se ajuste bien, porque tengo un desarrollador aparte que está tomando el código… para el backend y conectarlo con este front»*.

Es la misma regla de la primera versión: **«al lado, nunca encima»**.

Ese desarrollador **no trabaja en este repositorio**: toma de aquí el contrato y lo construye en el servidor. El contrato es `CONTRATO.md`, `src/shared/api/contrato.ts`, las vistas `/api/vistas/*` y las escrituras, `referencia/` (lo que cada endpoint tiene que responder), `docs/backend/sql/` y el motor de `src/entities` como especificación del cálculo. Por eso:

1. **Lo que existe en el contrato no se renombra, no se borra y no cambia de significado.** Un campo, un endpoint, un código de error o una tabla del SQL que él ya puede estar programando se queda como está.
2. **Lo nuevo se AGREGA al lado:**
   - un endpoint nuevo;
   - un campo nuevo y opcional en una respuesta;
   - una tabla o columna nueva con su valor por defecto;
   - una vista nueva con su caso de referencia.
   El front nuevo usa lo nuevo, y el backend puede ir agregándolo sin romper lo que ya tiene.
3. **Si algo de verdad tiene que cambiar o salir** (WhatsApp, por ejemplo), no se borra de golpe:
   - se marca **RETIRADO** en el contrato, con la fecha, el motivo y qué lo reemplaza;
   - el front deja de usarlo;
   - el backend sabe que **no tiene que construirlo** (si ya lo hizo, puede quitarlo cuando quiera);
   - un cambio que rompería el significado va como una **versión nueva** del endpoint (`…/v2`), al lado de la vieja.
4. **Las frases y textos que arma el motor** (y que la referencia le pide al backend que devuelva igual) también son contrato. Si cambian para simplificar, cada cambio va en el registro con el texto viejo y el nuevo, y la referencia se regenera a propósito.
5. **El registro de cambios para el backend:** `docs/backend/CAMBIOS-CONTRATO.md`.
   - Cada cambio del contrato, del SQL y de la referencia, con: fecha, commit, qué cambió, si es **AGREGADO**, **RETIRADO** o **VERSIÓN NUEVA**, qué tiene que hacer el backend y un ejemplo de petición y respuesta.
   - **La línea base es la versión 1: el commit `cde8214`** («front para entregar al backend», 7-oct-2026). Es la que tomó el desarrollador, según el dueño (27-oct).
   - Medido el 27-oct: desde v1, el contrato **solo creció por ruta**. Pasó de 49 a 78 endpoints; ninguno se renombró ni se borró por ruta, pero hay 16 commits que tocaron el contrato y el SQL creció mucho. **Falta revisar campo por campo** (nombres, tipos, significado y textos) contra `cde8214`.
7. **Podar el contrato con lo necesario de cada rol.** El objetivo es un producto pequeño y no uno enorme, así que el desarrollador del backend no debe construir lo que el producto necesario no usa.
   - Cada uno de los 29 endpoints nuevos desde v1 (y los campos nuevos) se clasifica: **lo necesita lo necesario aprobado** → AGREGADO, con su ejemplo; **no lo necesita** → no se le pide (va como «para después», en su escalón de la escalera).
   - Lo mismo con lo que ya estaba en v1: lo que ningún rol usa en lo necesario se marca «no prioritario», sin borrarlo.
   - Así, `CAMBIOS-CONTRATO.md` le dice al desarrollador, en una tabla corta: qué agregar ahora, qué dejar para después y qué ya no construir.
8. **Prueba:** `verificar-contrato` agrega una comprobación de que todo endpoint, campo y código de la línea base sigue existiendo (o está marcado RETIRADO con su reemplazo). Si alguien rompe el contrato sin registrarlo, la prueba falla.

---

## 4. El método: el algoritmo de cinco pasos, en este orden

Se aplica a **cada rol**, **cada pantalla** y **cada elemento** de la pantalla (tarjeta, cifra, frase, botón, gráfico o filtro). **El orden importa: no se optimiza ni se automatiza nada que debió borrarse.**

1. **Cuestionar el requisito.**
   - Cada elemento tiene que tener un **dueño con nombre**: quién lo pidió (Hollman, Edinson, Adair, la ANH, X4, un hallazgo de QA…) y para qué decisión.
   - Si nadie lo pidió, o si el «para qué» no es una decisión del rol, es candidato a borrar.
2. **Borrar.**
   - Borra el elemento, la pantalla o el paso del flujo.
   - **La prueba de que se borró lo suficiente:** hay que volver a poner al menos el 10 % de lo borrado. Si no hubo que devolver nada, se borró poco.
3. **Simplificar** lo que quedó: menos palabras, un número en vez de una frase y una acción en vez de dos.
4. **Acelerar:** menos toques y menos segundos hasta la decisión. Se mide.
5. **Automatizar,** al final y solo lo que sobrevivió. Por ejemplo, que el motor diga la frase en vez de pedirle a la persona que la arme.

**El examen de valor de cada elemento** (va en la tabla de §5):
- ¿Qué **decisión o acción** de este rol habilita? Si no habilita ninguna, no agrega valor.
- ¿**Cada cuánto** la usa? (cada turno, cada día, cada mes o casi nunca).
- ¿Qué pasa **si se borra**: alguien deja de poder hacer su trabajo, o solo deja de ver algo «interesante»?
- ¿Está **repetido** en otra pantalla?
- ¿Mueve el norte, es decir, baja diferidos o perdidos de los equipos críticos? ¿O es obligatorio (ANH, seguridad)?
- **El veredicto:** queda en la primera capa / va a un toque / va solo al papel (informe) / se funde con otro / **se borra**.

---

## 5. Fase A · Lo necesario de cada rol, y cómo se crece desde ahí

### 5.1 Primero: lo necesario, desde una hoja en blanco (es lo PRIMERO que ve el dueño)

Para cada rol, **sin mirar todavía las pantallas de hoy**, a partir de su trabajo real (la reunión, la investigación, X4 §2 y el norte):

| | Qué es | Límite |
|---|---|---|
| **VE** | Lo que tiene que saber para hacer bien su trabajo. Números, no frases | Los números necesarios, cada uno con su porqué. Uno manda (el principal); los demás lo apoyan. La guía es 1 + 3, y pasarse se justifica |
| **TIENE** | Lo que tiene que estar a su alcance cuando lo necesita: un equipo, una parada, un plan, un informe | Lo que agrega valor real a su trabajo, aunque lo use poco (por ejemplo, el reporte mensual a la ANH) |
| **HACE** | Las acciones que él hace en TRIM y que mueven el norte o son obligatorias | Las necesarias; la principal a 1 toque |
| **CUÁNDO** | En qué momento lo necesita: al empezar el turno, cuando algo se para (alarma), cada día, a fin de mes | Lo que no es de ese momento no se muestra en ese momento |

Cada cosa de lo necesario tiene que responder sí a las dos preguntas:
1. **¿Agrega mucho valor al problema que resuelve este rol** (bajar diferidos o perdidos, decidir a tiempo, cumplir)?
2. **Sin esto, ¿el rol haría peor su trabajo o perdería algo que no encuentra en otro lado?**

Si las dos respuestas son «no», no va. Y al revés: **si algo agrega mucho valor y no está, se agrega**, aunque hoy no exista (si el motor no lo tiene, se marca «falta en el motor»).

**La escalera de crecimiento**, por rol, encima de lo necesario:
- **Escalón 1:** lo siguiente que más valor agregaría, con su porqué y con quién lo pidió.
- **Escalón 2:** y así sucesivamente.
- **Lo que hoy existe y no entra en ningún escalón:** es candidato a borrar (§4).

Cada escalón dice qué número o qué acción suma y qué evidencia lo respalda. El dueño decide **hasta qué escalón** se construye en cada rol. Lo demás queda escrito para más adelante, no en la pantalla.

**Entregables de esta parte, lo primero que se le muestra al dueño:**
- `docs/experiencia-v3/necesario-por-rol.md`: una tabla por rol con VE · TIENE · HACE, más su escalera;
- una imagen de lo necesario de cada rol en el teléfono (390 × 844) y en el escritorio, con la dirección visual que el equipo recomiende;
- la comparación de lo que ve hoy contra lo necesario: cuántas cosas, cuántas palabras y cuántos toques.

### 5.2 Después: la ficha de valor de lo que existe hoy (para saber qué se borra)

**Por cada uno de los 11 roles**, en `docs/experiencia-v3/roles/<rol>.md`:

1. **Su trabajo en una frase,** con la evidencia del transcript, X4 y la investigación.
2. **Su pregunta** y **su decisión**: las que tiene que responder y tomar en TRIM.
3. **El inventario completo** de lo que ve hoy: cada pantalla y cada elemento, con su veredicto de §4 en una tabla. Columnas: elemento · dónde · quién lo pidió · qué decisión habilita · frecuencia · si se borra… · veredicto.
4. **Su pantalla necesaria («tipo número»):**
   - **1 número principal** con su unidad y su rótulo de 2 a 4 palabras;
   - **los números de apoyo necesarios** (la guía es 3; pasarse se justifica por el valor que agrega);
   - **1 acción principal** y las secundarias necesarias;
   - el gráfico o la lista que explica el número cuando agrega valor (el kit SCADA de §8, en el momento en que sirve);
   - todo lo demás, a un toque.
5. **Sus 3 tareas más frecuentes,** como flujo: pantalla → toque → resultado. Los toques y los segundos se cuentan **antes y después**.
6. **Lo que se le borra,** con su porqué.

**Hipótesis de partida que el equipo tiene que confirmar o refutar con evidencia** (de X4 §2 y §3.4 y del norte; no son la respuesta):

| Rol | Su pregunta | Número principal (hipótesis) | Acción principal |
|---|---|---|---|
| ger | ¿Cuánto se deja de producir y está bajando? | bbl/d que se dejan de producir ahora, con su tendencia | ver dónde se trabó, o nada: el gerente mira |
| prod | ¿Qué limita hoy la producción? | bbl/d que salen hoy contra lo que podrían | confirmar las paradas del día |
| sup | ¿Qué paró en mi turno y qué falta confirmar? | paradas por confirmar | confirmar en lote |
| oper | ¿Qué me preguntan ahora? | preguntas por contestar | contestar (un toque) |
| jefe | ¿Qué hay que intervenir ya y cuánto tarda una falla? | equipos para intervenir ya | crear el aviso en SAP |
| conf | ¿Qué atacar primero? | bbl/d en juego del primero de «Si falla hoy» | abrir ese equipo |
| plan | ¿Alcanzan los repuestos y el programa? | repuestos que no alcanzan | ver la orden |
| tec | ¿Qué me toca hoy? | trabajos de hoy | decir qué encontró |
| cont | ¿Qué paradas fueron de un tercero? | paradas atribuibles | ver la evidencia |
| reg | ¿Se puede reportar? | paradas sin causa | pedir la causa a quien la debe |
| adm | ¿Qué falta configurar? | pasos listos de N | seguir el paso que falta |

**Ojo con dos roles:** el MVP tiene apagados a plan y cont. Hay que decir si siguen apagados o si se borran del todo.

---

## 6. Fase B · Borrar WhatsApp por completo

Hoy WhatsApp aparece en **26 archivos de `src/`** y en **12 de pruebas**, además de `CONTRATO.md` (29 menciones) y el SQL (`docs/backend/sql/esquema.sql`, ejemplos y pruebas). Los lugares conocidos:

- **motor:** `entities/mensajes.ts`, `hoy.ts`, `escenarios.ts`, `pozos.ts`, `reglas.ts`, `roles.ts` y `usuarios.ts`;
- **costura:** `shared/api/mensajes.ts`, `hoy.ts`, `escrituras.ts` y `contrato.ts`;
- **pantallas:** `pages/Causa.tsx`, `Conectores.tsx`, `Hoy.tsx`, `Perfil.tsx` y `Turno.tsx`; `widgets/whatsapp/*` (`Telefono.tsx`, `NoEnviado.tsx`), `widgets/hoy/Entrega.tsx`, `Lateral.tsx` («El turno en WhatsApp») y `acciones.ts`; `widgets/conectores/Integraciones.tsx`, `configuracion/Accesos.tsx`, `Cabecera.tsx` y `Onboarding.tsx`;
- **configuración:** `shared/config/region.ts` y `app/store.ts`;
- **pendientes que mueren con esto:** la plantilla de Meta (B-33) y las preguntas de campo por WhatsApp.

**Qué hacer:**
1. **Inventario exacto** (grep de `whatsapp`, `mensaje`, `escal`, `recordatorio`, `plantilla`, `Meta` y `chat`): cada función, qué valor daba y a qué rol.
2. **Por cada función con valor real, su reemplazo DENTRO de TRIM,** sin canal externo. Por ejemplo:
   - la pregunta al operador se queda como la pregunta de Hoy en la app;
   - el escalamiento a quien no contestó pasa a ser un aviso con insignia en el Hoy del supervisor;
   - la entrega de turno se queda como resumen en pantalla y PDF, sin chat.
3. **En el FRONT, lo que solo servía para WhatsApp se borra:** el teléfono simulado, el historial de mensajes, «no enviado», la integración y los accesos de WhatsApp, las pantallas, las pruebas de pantalla y la documentación de uso (el documento comercial y el pitch).
4. **En el CONTRATO, se RETIRA, no se borra** (§3.1). Las rutas, los campos y las tablas del SQL de WhatsApp quedan marcados **RETIRADO** en `CONTRATO.md` y en `docs/backend/sql/`, con la fecha y el motivo («el dueño decidió quitar el canal de WhatsApp: el backend no lo construye»), y van en `docs/backend/CAMBIOS-CONTRATO.md`. El motor deja de producirlos, y la referencia de esos endpoints queda marcada como retirada, no borrada.
5. **Prueba de que se fue del producto:** `grep -ri whatsapp src e2e` da **0**. En el contrato y el SQL, solo aparece con la marca RETIRADO. Ninguna pantalla la menciona, y nada se rompe: tsc, oxlint, npm test y e2e en verde.
5. **El reporte a la ANH no cambia.** Verifícalo con la referencia (`referencia/anh/*`).

---

## 7. Fase C · La nueva dirección visual (sin el azul)

**Lo que sale:** el índigo #142d88 como panel, botón, selección y marca.

**Lo que se busca:** algo **contemporáneo, minimalista y profesional**, que conviva con ISA-101, donde el color es solo para lo anormal.

**Proponer TRES direcciones**, cada una con:
- **su paleta en tokens,** para los dos temas (claro y noche):
  - fondos, superficies, tinta y líneas;
  - **un acento** que nunca se confunda con un color de estado (ni rojo, ni naranja, ni amarillo, ni morado; tampoco verde ni azul de estado);
  - el color del panel de navegación.
- **la medición:** contraste WCAG 2.2 sobre los 5 fondos, en los dos temas, y separación de 10 o más (OKLab ×100) entre el acento y los 4 colores de estado con las 4 simulaciones de daltonismo. Usa el método de `docs/experiencia-v2/imagenes/fuente/scripts/medir-paleta.mjs`;
- **la tipografía:** se puede mantener Air o proponer otra. Si es otra, con su licencia verificada para web y PDF, y siempre con cifras tabulares;
- **imágenes en alta fidelidad** (escritorio 1440 × 900 y teléfono 390 × 844, claro y oscuro) del inicio de **ger, sup, oper y jefe** con la pantalla necesaria de §5, y de **un nivel 3 técnico (P-201B)** con el kit SCADA de §8.
  - Las imágenes van en `docs/experiencia-v3/imagenes/`, con su HTML en `fuente/`. **Nunca en `/tmp`.**

**Ideas de dirección**, para tomar o descartar con argumentos:
- **grafito y papel:** panel en gris carbón, acento único y sobrio;
- **blanco total tipo consola moderna:** panel claro con línea fina, acento de un solo tono;
- **oscuro de sala de control:** noche como tema principal y claro para la oficina.

**Evitar los lugares comunes:**
- crema con terracota;
- negro con un solo verde ácido;
- degradados morados;
- todo en tarjetas con el mismo radio y la misma sombra.

**El dueño escoge una** en la puerta de §10.

---

## 8. Fase D · El kit SCADA profesional

Un juego de componentes **propios, en SVG**, con el rigor de un HMI de alto desempeño (AVEVA Situational Awareness, Honeywell Experion, Ignition HP, Emerson DeltaV Live), que se use **igual en todas partes**:
- **indicador analógico de barra:**
  - escala fija por instrumento;
  - banda normal sombreada;
  - límites de alarma marcados;
  - puntero y valor en tinta;
  - en gris si el equipo está parado;
  - «escala provisional» si falta el rango (nada inventado);
- **tendencia:** ventana escrita, banda normal, alarma en discontinuo, escala que no cambia sola y como mucho 4 trazas;
- **la tubería y los símbolos de proceso:**
  - bomba, tanque con su nivel, válvula, separador, pozo y medidor;
  - una línea por fluido, distinguida por el trazo y no por el color;
  - grosor de línea y retícula consistentes;
  - simbología simplificada inspirada en ISA-5.1, sin 3D, sin sombras y sin animaciones de flujo;
- **la marca de estado:** forma + número + color + palabra, la paleta de X2, rojo solo para interlock;
- **la cifra:** número grande tabular, unidad corta, rótulo, y su tendencia de una línea si aporta.

Cada componente lleva:
- su ficha en `docs/experiencia-v3/kit-scada.md`, con anatomía, medidas, estados (normal, anormal, sin dato, sin comunicación, parado) y lo que nunca hace;
- su prueba en el auditor.

**Criterio de «se siente profesional»:**
- alineación a una retícula;
- grosores de línea consistentes;
- rótulos tabulares y alineados;
- nada decorativo;
- se lee a 1 metro en la pantalla de una sala;
- con guantes y al sol en el teléfono, los valores que deciden van a 18 px o más.

---

## 9. Fase E · Los flujos

1. **NO se le pregunta al dueño: el equipo INVESTIGA y le dice cuáles flujos están mal y por qué.** Lo pidió así: *«que lo investigues y me digas específicamente cuáles son… quiero hacerlo simple»*. Hay que recorrer cada flujo en la aplicación de verdad, con Playwright, rol por rol, y medirlo:
   - **toques y pantallas** hasta terminar la tarea;
   - **callejones sin salida:** una pantalla que no deja hacer lo que su número pide;
   - **idas y vueltas:** pasar por dos pantallas para lo que debería estar en una;
   - **lo repetido:** el mismo dato o la misma acción en varios lugares, con nombres distintos;
   - **lo que obliga a pensar:** elegir entre opciones que el sistema ya sabe, confirmar dos veces, leer un párrafo para actuar;
   - **lo que no lleva a nada:** una cifra sin acción, o un botón que solo abre otra lista;
   - **los cambios de contexto:** perder el campo, el período o el equipo al moverse.

   La evidencia ya medida está en `docs/experiencia-v2/R-revision/roles/<rol>.md` (los toques de cada tarea), `hallazgos-producto.md` y `hallazgos-ui.md`.

   **Entregable:** `docs/experiencia-v3/flujos-que-fallan.md`, una lista **específica y ordenada por impacto**. Cada flujo lleva:
   - el rol y la tarea;
   - el recorrido de hoy, paso a paso, con su captura;
   - qué está mal, en una frase;
   - el recorrido propuesto, con sus toques antes y después.

   Es lo que se le muestra al dueño.
2. **Por rol, sus 3 tareas más frecuentes** como diagrama de pasos, antes y después: pantallas, toques, segundos estimados y decisiones.
3. **Reglas del flujo:**
   - cada rol abre en su respuesta;
   - **la tarea principal está a 1 toque**;
   - ningún dato a más de 3 toques;
   - una acción principal por pantalla;
   - deshacer en vez de confirmar dos veces;
   - nada de modales con párrafos.
4. **Las puertas del panel:** ¿siguen siendo Hoy · La planta viva · Equipos · Resultados, o hay menos? Cada puerta tiene que pasar el examen de §4. Si un rol solo necesita una pantalla, no tiene menú.

---

## 10. Puerta de aprobación del dueño (no se construye nada antes)

Se le presenta al dueño, en **una página** con imágenes, para que decida:
0. **PRIMERO, lo necesario de cada rol** (§5.1): qué ve, qué tiene, qué hace y cuándo, con su escalera de crecimiento. El dueño aprueba lo necesario y escoge hasta qué escalón se construye en cada rol;
1. **la lista de lo que se borra** (incluido WhatsApp), con el porqué de cada cosa;
2. **la pantalla necesaria de cada rol** (imágenes de §7, con su número, su acción y lo que queda a un toque);
3. **las tres direcciones visuales,** para que escoja una;
4. **los flujos que fallan hoy** (la lista específica de §9) **y cómo quedan**, con los toques que se ahorran;
4b. **lo que cambia para el backend** (`CAMBIOS-CONTRATO.md`): qué se agrega, qué se retira y qué tiene que hacer el desarrollador. Debe confirmarse que nada de lo que él ya tiene se rompe;
5. **el kit SCADA,** en una lámina.

**Solo con su «hazlo»** se pasa a construir. Lo que pida cambiar se itera hasta su aprobación.

---

## 11. Fase F · Construir y Fase G · Probar

**Construir** con dueños de archivos que no se pisen, como en `docs/experiencia-v2/CONSTRUCCION.md`:
- borrar WhatsApp;
- poner la nueva dirección visual (tokens);
- poner el kit SCADA;
- poner la pantalla necesaria de cada rol;
- poner los flujos nuevos.

**Probar todo**, con la matriz de `docs/experiencia-v2/PROMPT-REVISION-UX.md` §11 más lo nuevo:
- **números:** cada inicio tiene 1 número principal y como mucho 3 de apoyo sin desplazarse, en 390 y 1440 px (regla nueva del auditor);
- **palabras:** el presupuesto de cada inicio sale de la pantalla necesaria aprobada. **En todo el producto, al menos −40 % de palabras** contra la medición de hoy (`docs/experiencia-v2/R-revision/medicion/despues.json`), con `herramientas/medir.mjs`;
- **toques:** la tarea principal de cada rol a 1 toque, medida en un e2e por rol;
- **WhatsApp:** el grep de §6 en cero;
- **paleta:** ningún resto del índigo (grep de `#142d88`, `--marca` con el viejo valor); contraste y daltonismo medidos;
- **ISA-101:** las 44 comprobaciones de X2 §6, una por una, después de construir;
- **el kit SCADA,** usado en todas partes (ningún indicador ni tendencia hecho a mano fuera del kit);
- `tsc -b`, `oxlint`, `npm test` (con la referencia regenerada a propósito) y **todas las e2e** en dev, Safari, Firefox, iPhone y el demo construido; el auditor en 6 anchos.

---

## 12. Entregables

En `docs/experiencia-v3/`:
1. `roles/<rol>.md`: la ficha de valor de cada rol (§5);
2. `borrado.md`: todo lo que se borra, con su porqué y quién lo había pedido;
3. `whatsapp.md`: el inventario y el reemplazo de cada función (§6);
4. `direcciones.md` e `imagenes/`: las tres direcciones con sus mediciones y sus imágenes (§7);
5. `kit-scada.md`: el kit (§8);
6. `flujos-que-fallan.md` (la lista específica, investigada) y `flujos.md` (antes y después, con sus toques) (§9);
6b. `docs/backend/CAMBIOS-CONTRATO.md`: el registro para el desarrollador del backend (§3.1);
7. `aprobacion.html`: la página para el dueño (§10);
8. después de construir, `qa-final.md`: la medición antes y después (palabras, números, toques), las 44 comprobaciones y las pruebas con su salida.

## 13. Definición de «terminado»

- [ ] Cada rol tiene **lo necesario (ve · tiene · hace · cuándo) y su escalera de crecimiento**, aprobados por el dueño, y se construyó solo hasta el escalón que él escogió.
- [ ] Cada rol tiene su ficha de valor y su pantalla necesaria aprobada por el dueño.
- [ ] WhatsApp no existe en el producto, el contrato, el SQL, las pruebas ni los documentos técnicos.
- [ ] El azul se fue. La dirección visual escogida está en los tokens, con contraste y daltonismo medidos.
- [ ] Cada inicio de rol muestra **1 número principal** y como mucho 3 de apoyo, con una acción principal a 1 toque.
- [ ] Al menos −40 % de palabras en todo el producto, sin perder nada obligatorio ni que agregue valor.
- [ ] El kit SCADA se usa en todas partes y se ve profesional (lámina aprobada).
- [ ] Las 44 comprobaciones de ISA-101 cumplen o tienen su razón escrita.
- [ ] Todo en verde: tsc, oxlint, npm test, e2e en los 5 navegadores y el auditor.
- [ ] Nada inventado. El motor calcula y la pantalla pinta. Diferido no es pérdida. El reporte a la ANH, intacto.
- [ ] **El contrato solo creció:** nada de la línea base se renombró, se borró ni cambió de significado. Lo retirado está marcado RETIRADO con su reemplazo. `docs/backend/CAMBIOS-CONTRATO.md` dice al desarrollador del backend exactamente qué agregar y qué ya no construir. La prueba de `verificar-contrato` lo asegura.
- [ ] Los flujos que fallaban (`flujos-que-fallan.md`) quedaron arreglados y medidos.
