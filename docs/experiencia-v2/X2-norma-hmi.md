# X2 · La norma de HMI de alto desempeño, aplicada a TRIM

**25-oct-2026 · X2, experto en HMI de alto desempeño del equipo de diseño.** Sigue el `BRIEF.md` de esta carpeta. No toca código del producto.

Lo que sostiene este documento está en el scratchpad del equipo:

- `SCR = /private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/ux/X2`
- `SCR/capturas/`: 31 capturas propias del demo construido (`http://127.0.0.1:4173`), en claro, en oscuro y en teléfono. Las tomó `SCR/scripts/capturas.mjs`, que además mide qué parte de cada pantalla lleva color saturado (`SCR/capturas/informe.json`).
- `SCR/scripts/paleta.mjs`: el contraste WCAG 2.2 y la separación entre colores, con visión normal y con daltonismo. Con las paletas `SCR/paletas/actual.json` y `SCR/paletas/propuesta.json`; el resultado está en `SCR/paletas/propuesta-medida.md`.
- `SCR/scripts/auditar-estilo.mjs`: un prototipo del auditor de estilo de §6. Su línea base de hoy está en `SCR/auditoria-estilo-linea-base.md`.
- `SCR/descargas/`: el texto de las fuentes en PDF que se pudieron bajar (cada una en su carpeta).

**Cómo leer las fuentes.** Cada regla lleva su fuente entre corchetes; la lista completa está en §9.

- **[P]**: fuente primaria (la norma, el organismo o el autor).
- **[S]**: fuente secundaria seria. Por ejemplo, el primer autor del manual HPHMI explicando su propio libro, o un fabricante explicando cómo aplica ISA-101.
- **NO VERIFICADO**: no se pudo leer el texto (casi siempre porque la norma es de pago).

Las normas ISA, IEC y EEMUA son de pago y aquí no se leyeron completas. Lo que se afirma de su contenido sale de los extractos oficiales gratuitos (índices e introducciones) o de fuentes secundarias, y así se marca.

## Índice

1. [Lo que dicen las normas, y qué tan seguro es](#1-lo-que-dicen-las-normas-y-qué-tan-seguro-es)
2. [TRIM hoy contra la norma](#2-trim-hoy-contra-la-norma)
3. [La jerarquía de 4 niveles en TRIM, por rol](#3-la-jerarquía-de-4-niveles-en-trim-por-rol)
4. [La paleta funcional exacta](#4-la-paleta-funcional-exacta)
5. [Indicadores](#5-indicadores)
6. [Lista de comprobación para construcción y QA](#6-lista-de-comprobación-para-construcción-y-qa)
7. [Pedidos al motor y a producto](#7-pedidos-al-motor-y-a-producto)
8. [Desacuerdos](#8-desacuerdos)
9. [Fuentes](#9-fuentes)
10. [Resumen](#10-resumen)

---

## 1. Lo que dicen las normas, y qué tan seguro es

### 1.1 ANSI/ISA-101.01-2015 y su versión internacional, IEC 63303:2024

**Lo verificado en el extracto oficial** [P: F1]:

- Fue aprobada el 9 de julio de 2015.
- Entre sus votantes estaban dos autores del manual HPHMI (W. Hollifield, de PAS, e I. Nimmo) y D. Lutz, de NOVA Chemicals, la planta del estudio ASM de §1.4. Hay además usuarios petroleros: Oxy y ExxonMobil Chemical, y Chevron y Phillips 66 en la junta que la aprobó.
- **Su propósito, textual**: «improve the user's abilities to detect, diagnose, and properly respond to abnormal situations».
- **Su estructura** tiene nueve cláusulas:
  - 4, gestión del sistema HMI: el ciclo de vida, con 4.2 «System Standards», donde viven la filosofía y la guía de estilo;
  - 5, factores humanos;
  - 6, estilos de pantalla y estructura, con **6.3 «Display Hierarchy»** y las **figuras 3 a 6, «Sample Level 1 … Level 4 Display»**;
  - 7, interacción, con la **Tabla 7, «Example numeric decimal formatting»**, y la **Tabla 8, «Example access and navigation performance»**;
  - 8, desempeño;
  - 9, formación.
- **El cuerpo mezcla requisitos obligatorios y recomendaciones**, y cada cláusula dice al empezar si trae obligatorios.

**La serie ISA-101 hoy** [P: F2]:

- ISA-TR101.01-2022, *HMI Philosophy*, que «builds on subclause 4.2.1 of the core standard»;
- ISA-TR101.02-2019, *HMI Usability and Performance*.

ISA no muestra ninguna revisión de la norma en curso. ISA-101 dejó «el qué» en la norma y «el cómo» en los informes técnicos [S: F4].

**IEC 63303:2024**, edición 1.0 de agosto de 2024 [P: F3, vista previa oficial]:

- Dice textualmente: «This document was derived from ANSI/ISA-101.01-2015».
- Agrega cosas que importan a TRIM:
  - una cláusula 4, **«User types»**;
  - 5.2.2 **HMI philosophy**, 5.2.3 **HMI style guide** y 5.2.4 **HMI toolkit**;
  - 6.1.2 **«Consistency of design»** y 6.1.5 **«Situation awareness»**;
  - 7.3 **«Display hierarchy»**, con 7.3.2 a 7.3.5, una subcláusula para cada nivel del 1 al 4;
  - 8.2.3 **«Navigation methods»**, con un diagrama de navegación de ejemplo;
  - 9.2.2 **«Call up time»** y 9.2.3 **«Display refresh rate»**;
  - **10.6 «Management»**: la formación también para la gerencia;
  - el anexo B, con ejemplos de pantallas: cuatro de nivel 1, tres de nivel 2, una de nivel 3 y otra de nivel 4, además de «Health diagnostic» y «Alarm summary».
- Su introducción trae una regla que toca de frente a TRIM, que es el HMI de un proveedor dentro de la operadora: cuando un equipo trae su propio HMI, «the asset owner should perform a formal assessment of deviations of each equipment HMI from the asset owner's HMI philosophy».

**Lo que no se pudo verificar en el texto** (NO VERIFICADO):

- qué dice cada nivel de la jerarquía, palabra por palabra;
- los valores de las tablas 7 y 8;
- cualquier regla de color.

Las descripciones de los niveles que se usan en §3 vienen de Hollifield [S: F5, F6] y de Rockwell [S: F17]. Las dos coinciden entre sí.

**Lo que ISA-101 no fija.** Ninguna fuente consultada dice que ISA-101 publique una paleta. Lo que pide es que exista una filosofía y una guía de estilo del sitio, y que se cumplan [S: F17, «Use of color should be standardized, consistent, rigorously followed, and documented in the HMI Style Guide»; P: F2, sobre el TR de filosofía]. Ya lo había concluido R4 §5.3.

**Alcance para TRIM** (de acuerdo con `18-bombas` §6.5 y R4 §5.3):

- ISA-101 e IEC 63303 rigen el HMI «used to monitor and interact with the control system». TRIM monitorea y analiza, pero no actúa sobre el control.
- **TRIM no puede declarar «cumplimiento ISA-101».**
- Sí puede seguir su ciclo de vida en lo que le toca:
  - una filosofía y una guía de estilo escritas: este documento, U1 §9 y los tokens;
  - una caja de herramientas: `Prioridad.tsx`, `Analogico.tsx`, `Sparkline.tsx`, `BarraMeta.tsx` y `Simbolos.tsx`;
  - pruebas del estilo: §6;
  - auditoría periódica: el auditor.
- Y puede **adoptar la guía de estilo de cada operadora** (la `GuiaEstilo` `'sitio'` de P1 §1.13), que es lo que la introducción de IEC 63303 le pide al dueño del activo.

### 1.2 ISA-18.2 e IEC 62682 (gestión de alarmas)

Ediciones vigentes:

- **ANSI/ISA-18.2-2016**, que reemplazó a la de 2009 [S: F10];
- **IEC 62682:2022, edición 2.0**, de diciembre de 2022, que reemplaza a la 1.0 de 2014 [P: F11].

Lo que aplica a TRIM:

| Regla | Qué dice | Fuente |
|---|---|---|
| Qué es una alarma | «audible and/or visible means of indicating to the operator an equipment malfunction, process deviation, or abnormal condition requiring a **timely** response». La palabra *timely* entró en 2016 para alinearse con IEC 62682 | [S: F10] |
| Qué es una alerta (2016) | «a notification of an abnormal condition that requires assessment or action and which does not meet the criteria for an alarm». La norma no dice cómo se muestra; el comité preparaba un informe técnico sobre alertas | [S: F10] |
| Prioridad | Se fija por **la gravedad de la consecuencia y el tiempo para responder** | [S: F8] |
| Cuántas prioridades | «no more than three or four» | [S: F8, edición 2009] |
| Distribución de lo que suena | Con tres prioridades: 80 % baja, 15 % media, 5 % alta. Con cuatro, además < 1 % de «la más alta» | [S: F8, tabla de métricas de 2009] |
| Carga | **6 por hora** (1 cada 10 min) se considera muy probablemente aceptable y 12 por hora es lo máximo manejable; inundación: > 10 en 10 min, menos del 1 % del tiempo; alarmas viejas (> 24 h): menos de 5 al día | [S: F8] |
| Cómo se muestra cada estado (tabla de la norma de 2009) | Normal: ni sonido, ni color, ni símbolo, ni parpadeo. **No reconocida: sonido, color, símbolo y parpadeo.** Reconocida: color y símbolo, sin parpadeo. Vuelta a normal sin reconocer: color, símbolo y parpadeo opcionales. Suprimida por diseño, archivada (*shelved*) o fuera de servicio: color y símbolo opcionales, sin parpadeo | [S: F8, que reproduce la tabla de ANSI/ISA-18.2-2009] |
| Quién fija los colores | La **filosofía de alarmas** del sitio: «the rules for classifying and prioritizing alarms, for **using color to indicate an alarm in the HMI**…» | [S: F8] |
| Alarmas del sistema instrumentado de seguridad | Se clasifican como «highly managed alarms» y «should receive special treatment particularly when it comes to viewing their status in the HMI» | [S: F8] |
| Navegar a la alarma | La pantalla debe llevar a la fuente de la alarma con un clic | [S: F8] |

**Para TRIM:**

- TRIM no reconoce alarmas y no tiene sonido. Por eso **nada debe parpadear**: el único parpadeo legítimo, el de la alarma no reconocida, no existe en TRIM. U1 §9.3 ya lo dice, y estoy de acuerdo.
- Lo que TRIM llama «aviso» (fuera de meta, tendencia lenta) y lo que anticipa el vigía están más cerca de la **alerta** de 2016 que de la alarma.

### 1.3 «The High Performance HMI Handbook» (Hollifield, Oliver, Nimmo y Habibi; PAS, 2008)

El libro es de pago y **no se leyó**. Lo que sigue sale de dos textos de su primer autor que lo resumen:

- Hollifield y Perez, PAS 2012, publicado por ISA [S: F5];
- Hollifield en InTech [S: F6].

| Regla | Cita o paráfrasis exacta | Fuente |
|---|---|---|
| Fondo | «Gray backgrounds to minimize glare» | F5 |
| Color | «Color, by itself, is never used as the sole differentiator of an important condition or status». Los colores brillantes son para lo anormal; los de alarma, «solely for the depiction of an alarm-related condition and functionality and for no other purpose». «HPHMI is not either eliminating color or just converting graphics to grayscale» | F5, F6 |
| El rojo y el verde | Rojo = parado y verde = en marcha es «the most common and worst color principle violation». Estar parado «is usually a normal and appropriate status» | F6 |
| Estado de un equipo | **Por brillo**: más claro que el fondo, en marcha («think of a light bulb inside them»); más oscuro, parado; **sin estado medido, del mismo color del fondo**; y siempre con una palabra al lado | F5 |
| La alarma | Pintar el valor o su fondo es «a poor practice». La alarma va en un **indicador aparte con forma, color y texto**, junto al valor; parpadea mientras no se reconoce y queda mientras dure | F5, F6 |
| Indicador analógico | El valor sobre su rango deseable (en sus figuras, una banda azul clara), con las alarmas y **el umbral donde actúa el interlock**; con eso, un vistazo de dos segundos a un banco de indicadores basta | F5, F6 |
| Tendencias | «The most glaring deficiency in HMI today». Van **embebidas**, con el rango normal y el anormal dibujados, y aparecen solas al abrir la pantalla. No más de **3 o 4 trazas** por gráfica | F5 |
| Barras | Mejor un puntero que una barra llena: cuando el valor baja, la barra desaparece, y el ojo detecta mejor la presencia que la ausencia | F5 |
| Nivel de un recipiente | Nada de manchas de color; una franja que muestre la cercanía a las alarmas, y mejor aún con su tendencia | F5 |
| Movimiento | «No animation except for specific alarm-related graphic behavior». Están mal las bombas que giran, las bandas que se mueven y las llamas animadas | F5 |
| Profundidad | «Low-contrast depictions in 2-D, not 3D». Nada de recipientes en 3D | F5 |
| Jerarquía | Cuatro niveles «providing for the progressive exposure of detailed information» (§3.1) | F5, F6 |
| El nivel 1 | No se parece a la planta: «Does your automobile instrument panel look like a diagram of your engine?». Desde él no se opera | F5 |
| Ficha (*faceplate*) | Aparece en una **zona reservada**, sin tapar el gráfico | F5 |
| Método | Siete pasos. El primero: «Adopt a high performance HMI philosophy and style guide». El segundo: medir las pantallas contra la filosofía | F5 |

### 1.4 ASM Consortium (*Effective Operator Display Design*)

Dos ediciones de la guía, y la segunda cambió el énfasis:

- 1.ª edición: Bullemer, Reising, Burns, Hajdukiewicz y Andrzejewski, *Effective operator display design*, ASM Consortium, 2008 [P: cita completa en F12]. Tiene 16 áreas de guías; la de color trae 8 guías, una de ellas sobre el fondo.
- 2.ª edición: *Effective Console Operator HMI Design* (Bullemer y Reising, 2013). Pasó de 81 a 64 guías y pone el énfasis en **la jerarquía de pantallas y la conciencia de situación** [S: F14].
- Las dos son de pago; no se leyeron (NO VERIFICADO en su texto).

Lo verificado en el documento del propio consorcio [P: F12]:

- Recomienda **fondos gris claro**, junto con una sala bien iluminada:
  - ayudan a quien no distingue colores;
  - reducen el reflejo;
  - dejan leer papel.
- La relevancia visual se maneja con **«movement, form and color»**. Hollifield agrega por qué el movimiento pesa tanto: en la visión periférica se nota el movimiento y no el cambio de color [F5].
- «if red means critical alarm state then it should not also mean a pump is off».
- No recomienda la escala de grises pura: «the ASM Consortium does NOT recommend only using grayscale…».
- Los fondos de color (beige, verde, azul) se descartan porque se comen parte de la paleta para quien tiene daltonismo.

**El estudio ASM con NOVA Chemicals** (planta de etileno, 21 operadores, 2004) [S: F13]:

| Resultado | Pantallas ASM | Tradicionales |
|---|---|---|
| Detectaron el evento antes de la alarma | 48 % de las veces | 10 % |
| Resolvieron con éxito | 96 % | 70 % |
| Tiempo para terminar | 10,6 min | 18,1 min (41 % menos) |

La investigación previa (`12-estandar` §A.2) citó «48 % de mejora en la detección». La cifra correcta es otra: 48 % contra 10 % de detección antes de la alarma (ver §8).

### 1.5 NUREG-0700, revisión 3 (NRC de EE. UU., julio de 2020)

Es pública y se leyó completa [P: F15]. Es la guía de revisión de interfaces de las centrales nucleares; no obliga a TRIM, pero es la fuente primaria más detallada sobre color, parpadeo y calidad del dato. Según el índice de la NRC que mostró el buscador, existe una revisión 4 de enero de 2026. No se pudo abrir (la NRC devolvió 403) y **no se revisó** (NO VERIFICADO).

| Guía | Qué dice |
|---|---|
| 1.3.8-1 | El color se usa «conservatively and consistently», con el mínimo de colores necesario |
| 1.3.8-5 | **«Colors for coding should be based on user conventions»**: los colores tienen que coincidir con los que el usuario ya usa en su trabajo. *Es el argumento normativo para adoptar la convención de Adair si es la de las operadoras* |
| 1.3.8-9 | Cada color representa una sola categoría |
| 1.3.8-10 | El color va redundante con otro rasgo: la pantalla se tiene que entender **en blanco y negro, impresa o por quien no distingue colores** |
| 1.3.8-12 | Evitar combinar rojo y verde |
| Tabla 1.3 | Rojo = peligro o estado de alarma; amarillo = precaución o estado anormal; **magenta = estado de alarma**; azul oscuro = aviso. *El magenta no significa «sin comunicación» en esta tabla* |
| 1.3.10-2 | En condición normal, **lo resaltado no debe pasar del 10 %** de lo que se muestra |
| 1.3.10-9 a 1.3.10-13 | El parpadeo es solo para lo que pide atención urgente. Parpadea un símbolo junto al texto, no el texto. Solo un área pequeña, máximo dos frecuencias (una sola: 2 a 3 por segundo) y siempre una forma de apagarlo |
| 1.1-21 | Si importa qué tan reciente es un dato, **se anota la hora** |
| 14.3-3 a 14.3-5 | El dato se muestra con su **calidad**: válido, inválido, sin validar o estimado |
| 1.3.1-4 | La letra de un texto que se lee mide **al menos 16 minutos de arco** (20 a 22 es lo preferido) |

### 1.6 EEMUA 201 (3.ª edición, 2019) y EEMUA 191

EEMUA 201 es de pago. Lo que sigue sale del artículo de quien la reescribió para EEMUA, Andy Brazier, de Wilde Analysis [S: F16].

**Qué lleva la vista general:**

- el caudal del sistema;
- el balance de materia: si lo que entra y lo que sale cuadran;
- el estado de los equipos críticos: en línea, en reserva o disparado;
- lo de las partes que más pesan en el resultado.

**Cómo se muestra:**

- **las tendencias son con frecuencia la mejor forma** de mostrar la vista general;
- los indicadores tipo medidor muestran si un valor está en su rango sin hacer cuentas;
- el estado de alarma de un subsistema se puede marcar con color, para que dirija la mirada.

**Color:**

- el «grey screen» fue impopular con algunos operadores;
- «full minimisation is not necessarily the best solution»: se admiten **colores pálidos o menos saturados para el estado** si no compiten con las alarmas, que son las brillantes;
- el esquema, sea cual sea, «needs to be fully documented and applied consistently».

**Para TRIM:** esto calza casi palabra por palabra con lo que el dueño pide para el gerente: caudal, balance (potencial contra real), equipos críticos y dónde se pierde. §3.3 lo usa.

Las métricas de carga de EEMUA 191 son las de §1.2 [S: F8].

### 1.7 Cómo lo aplica un fabricante: la guía de Rockwell (PlantPAx)

El *Process HMI Style Guide* de Rockwell (PROCES-WP023) cita ANSI/ISA-101.01-2015 y ANSI/ISA-18.2-2016 [S: F17]. Sirve de contraste, porque es una guía real de un fabricante.

**Los niveles** se definen igual que en Hollifield:

- el 1 es la vista general de todo lo que maneja el operador, y desde ahí no se opera;
- el 2 es la pantalla principal de trabajo, **«should be designed first»**;
- el 3 es el detalle;
- el 4, el soporte y el diagnóstico.

**Lo que trae el nivel 1:**

- indicadores clave;
- alarmas de las 2 o 3 prioridades más altas;
- estado de los equipos mayores;
- **tendencias**;
- indicaciones de lo anormal con su gravedad.

**Sus colores:**

| Uso | Color |
|---|---|
| Alarma urgente | rojo `#E22028` |
| Alarma alta | naranja `#EC8629` |
| Alarma media | amarillo `#F5E11B` |
| **Alarma baja** | **magenta `#916AAD`** |
| Falla o mala configuración | negro |
| En marcha | blanco hueso `#F0F0F0` |
| Parado | gris `#808080` |
| En transición | azul claro |

Para la falla de comunicación no hay morado. Esto prueba que **los colores de cada estado son de cada fabricante y de cada sitio**.

**Otras reglas:**

- el parpadeo solo para lo que pide atención inmediata, nunca en el texto, y con forma de apagarlo;
- los grupos de barras relacionadas **se escalan para que «todo bien» se vea como una línea recta**;
- la minigráfica (*sparkline*) es «a single value over time within context of limits».

### 1.8 Lo que dijo Adair contra la norma

Adair [33:45]: «Tema moradito con falla de comunicación, rojo con interlock, naranja con amarillo con alarma, así. Que es basado en la ISA 101, no, eso es basado con una norma, no inventamos nada ahí con eso» (`docs/reuniones/2026-10-19-edinson-adair/transcript.txt`, línea 62).

| Lo que dijo | ¿Lo fija la norma? | Lo que hay |
|---|---|---|
| Gris lo normal, color lo anormal | **Es el principio de HPHMI** que ISA-101 recoge. El texto de ISA-101 es NO VERIFICADO | F5, F6, F12, F17 |
| Color siempre con forma y texto | **Sí, en todas las fuentes** | Tabla de ISA-18.2 (color y símbolo); NUREG 1.3.8-10; HPHMI |
| Morado = falla de comunicación | **No.** Es convención de sitio o de fabricante. En PlantPAx el magenta es la alarma **baja** [F17]; en NUREG, «estado de alarma» [F15]. No se encontró ninguna norma que lo fije (NO VERIFICADO en ISA-101) | Sí está la regla de mostrar la calidad del dato (NUREG 14.3) y, en HPHMI, el equipo sin estado se pinta del color del fondo |
| Rojo = interlock | **No como color.** Sí pide **trato especial** para las alarmas del sistema de seguridad («highly managed», ISA-18.2) [F8]. Ejemplo de sitio con rojo para el interlock: la guía del Global Interlock System del NSO (R4 §5.3) | La forma propia del interlock aparece en HPHMI: indicadores «I» y el umbral de interlock en el analógico [F5, F6] |
| Naranja y amarillo = alarma | Práctica común, no norma: PlantPAx usa naranja para la alta y amarillo para la media [F17] | — |
| «Que cuando abra el software tenga ese mismo estándar» | **Sí**: IEC 63303 pide evaluar al HMI de un proveedor contra la filosofía del dueño del activo [F3], y NUREG pide colores según la convención del usuario [F15 1.3.8-5] | De ahí la `GuiaEstilo` `'sitio'` |

**Conclusión:**

- La convención de Adair es **válida como guía de estilo del sitio** y TRIM debe poder adoptarla. NUREG 1.3.8-5 da el porqué: el usuario ya la tiene en la cabeza.
- Pero no es «la de la norma». Ante un cliente no se dice «estos colores son los de ISA-101»; se dice «esta es la guía de estilo de TRIM, conforme a ISA-101 y a ISA-18.2, configurable a la suya».
- Antes de fijarla, **hay que pedir la guía de estilo de la operadora piloto**: la de Adair puede ser la de una sola operadora (P1 §8.4, pregunta 25).
- La asociación «rojo = peligro o parada de emergencia» viene, probablemente, de la convención de pilotos y botones de máquina (IEC 60073 e IEC 60204-1: rojo emergencia, amarillo anormal, verde normal, azul obligatorio). Eso sale de fuentes secundarias y está NO VERIFICADO contra el texto de esas normas.

---

## 2. TRIM hoy contra la norma

**Cómo se midió:**

- Recorrí el demo construido con Playwright: 24 pantallas en 1440 px y claro, 4 en oscuro y 3 en teléfono (390 px).
- Medí cuánto color saturado tiene cada captura (`SCR/capturas/informe.json`) y corrí el prototipo del auditor de estilo (`SCR/auditoria-estilo-linea-base.md`).
- Leí `src/index.css`, `Prioridad.tsx`, `Info.tsx`, `Sparkline.tsx`, `Analogico.tsx`, `BarraMeta.tsx`, `Simbolos.tsx` y `Planta.tsx`, U1 §9 y `08-presentacion`.

**Lo que ya está bien, y es raro en el mercado.** TRIM cumple las reglas que más cuestan:

- **Fondo gris.** Lo normal no tiene color: **entre 0,02 % y 0,24 % de los píxeles** llevan color saturado en las 27 capturas claras (24 de escritorio y 3 de teléfono), contra el 10 % de resaltado que NUREG 1.3.10-2 admite en condición normal.
- **Triple código de prioridad**: color, forma y número.
- **Nada se mueve**: el auditor contó 0 animaciones.
- **Gráficas grises con huecos** en vez de ceros.
- **Indicador analógico con banda.**
- **`prefers-reduced-motion`**.

X1 §3.2 llega a lo mismo.

| # | Regla (fuente) | TRIM hoy (evidencia) | Brecha | Peso |
|---|---|---|---|---|
| B1 | **Un color, un significado** [F5, F15 1.3.8-9, F17] | El rojo es la alarma P1 y a la vez «equipo de alto impacto parado» (`Trabajo.tsx:89,124`; `Pozos.tsx:67`). El amarillo P3 es aviso de proceso y también «fuera de meta» de gestión | Adair reserva el rojo para el interlock. Paleta nueva en §4 | Alta |
| B2 | **Colores separables con daltonismo** [F12; F15 1.3.8-7] | Rojo P1 contra naranja P2: 6,1 de separación con visión normal y 4,7 con deuteranopía (OKLab ×100; < 5 se confunde). Azul P4 contra morado: 3,2 en claro y 2,3 en oscuro (medido igual por X1 §3.5 y por `SCR/scripts/paleta.mjs`) | §4.5: con la paleta propuesta, el par rojo-naranja sube a 12,8 en claro y a 10,5 en oscuro (peor caso de los cuatro tipos de visión) | Media |
| B3 | **El interlock tiene trato propio** [F8 «highly managed»; F5, F6 umbral de interlock] | No existe el concepto (R4 §5.1) | La condición `interlock` (P1 §1.13) con su forma (§4.2) y su marca en el analógico (§5.1) | Alta (pedido de Adair) |
| B4 | **El estado del equipo se ve por brillo**: en marcha más claro que el fondo, parado más oscuro, sin dato igual al fondo [F5, F17] | Todos los glifos se rellenan siempre con `--eq-off` y `--eq-on` (`Simbolos.tsx:8-10`), sin importar si el equipo corre. La diferencia entre los dos es de 1,94:1. El estado solo lo dice el pie de texto | §4.3: relleno por estado | Alta (lo «tipo SCADA») |
| B5 | **No pintar el valor ni su fondo**: la alarma va en un indicador aparte, con forma, color y texto [F6] | `Analogico` pinta el número y el puntero con el color de la prioridad (`Analogico.tsx:52,74,94-95`). El auditor encontró textos en color de condición: «0 psi», «0 bbl/d» y «0 A» en Bombas; «8,8 psi» y «9,6 psi» en Morichal. «sin señal» va en morado (`:72`). El esquema tiñe la caja entera del equipo (`Planta.tsx:407`). En cambio, `FueraDeMeta` ya hace lo correcto: el número en tinta y el cuadrado al lado | §5.1 y §5.4: el número en tinta (negrita si es anormal) y la marca al lado | Media |
| B6 | **Tendencias embebidas**, con el rango normal y no más de 3 o 4 trazas [F5; F16; F17] | `Sparkline` solo está en la ficha (`PanelEquipo.tsx:108`). Las placas de Bombas (la pantalla de grupo del supervisor, §3.2) no tienen tendencia. Ningún nivel 1 tiene tendencia de lo que se está perdiendo | §5.3 | Alta |
| B7 | **Escala estable y comparable** en un banco de indicadores [F17 §6.5; F5] | La escala de `Analogico` sale del valor actual, la banda y los límites, más 12 % (`Analogico.tsx:39-44`). Si la bomba para y el valor cae a 0, la banda salta a la derecha (captura `sup_bombas_ceiba_curso__claro_1440.png`). Tampoco marca dónde dispara la protección | §5.1: escala fija por instrumento y la marca del disparo | Media |
| B8 | **Jerarquía de 4 niveles con un nivel 1 de una sola vista** [F1 6.3; F3 7.3; F5; F17] | No hay un nivel 1 por rol. Producción, la pantalla de inicio de producción, mide **3.278 px** y mezcla el nivel 1 (tubería), el 2 (día a día) y el 4 (factor, cuadre, carga de la asignación). El Resumen del gerente mide 1.806 px, con 6 cifras de 24 px o más en la primera vista | §3 | Alta |
| B9 | **Supresión por estado**: un equipo parado no dispara las alarmas de sus propias variables [F8, «suprimida por diseño»] | La placa de P-201B parada lleva **cuatro rombos P1**: el de la placa y los de presión, caudal y corriente en 0. La ficha suma otros tres en «fuera de banda» | Con el equipo parado, una sola marca (la de la parada). Sus variables se ven en gris con «parada», sin prioridad propia | Media |
| B10 | **La misma marca para el mismo objeto en todas partes** [F3 6.1.2; F5] | P-201B es rombo P1 en Bombas, Riesgo y Turno, y **triángulo P2** en Mantenimiento › «Paradas por identificar», donde la prioridad es la de la tarea («sigue parado») | La prioridad de una tarea no usa la marca del equipo: lleva «falta identificar» en gris (§4.2) | Media |
| B11 | **Ficha en zona reservada, sin tapar el gráfico** [F5] | La ficha es un panel lateral que tapa más o menos el 40 % de la pantalla y oscurece el resto (captura `sup_bombas_ceiba_curso_P-201B__claro_1440.png`) | Panel sin velo y que no tape la franja de condiciones, o página propia (§3.1) | Media |
| B12 | **2D y sin profundidad** en el dibujo de proceso [F5; F17] | Sombra `sombraNodo` en cada caja (`Planta.tsx:301-302,409`) y un halo de 5 px bajo cada tubería (`:329`). El auditor encuentra 9 filtros SVG en Planta | Quitar la sombra y el halo del esquema. Las tarjetas de la interfaz pueden seguir con su borde | Baja |
| B13 | **Calidad y vigencia del dato a la vista** [F15 14.3-3 a 14.3-5; 1.1-21] | «sin señal» mezcla tres cosas: la falla de comunicación, el dato que no corresponde y la medición por campaña (R4 §5.4; `equipos.ts:247`). No dice desde qué hora. «Calculado» y «simulado» sí se dicen | La separación de U1 §9.2 (de acuerdo) más la hora: «sin comunicación desde 14:07» | Media |
| B14 | **Lo medido manda** en el nivel 1 [F15 14.3-5; principio de custodia de `08` §8.9] | La cifra más grande del Resumen del gerente es el retorno **simulado** (45.233 bbl en el portafolio). Lo medido (2.377 bbl) va debajo (X1 §3.4) | En el nivel 1, lo simulado nunca es más grande ni va más arriba que lo medido (§5.6) | Media |
| B15 | **La pantalla no decide la prioridad**: la fija la filosofía, por consecuencia y tiempo [F8; BRIEF «el motor calcula»] | `Analogico` deduce la prioridad si el servidor no la manda (`Analogico.tsx:51`) | Sin prioridad del motor, el indicador muestra la posición pero no pone marca (§5.1) | Baja |
| B16 | **Letra legible**: al menos 16′ de arco [F15 1.3.1-4] | Con el píxel de referencia de CSS (1 px ≈ 1,28′ [F19]), 16′ son una mayúscula de **12,5 px**. En Air la mayúscula mide 0,698 del cuerpo (medido en el navegador), así que hace falta un cuerpo de **unos 18 px**. Los 13 px del cuerpo de TRIM dan 11,6′. Entre el **60 % y el 90 % de los textos visibles** miden menos de 12 px (auditor; X1 cuenta unos 900 usos en `src/`) | §5.6 | Alta para el operador al sol y el gerente en portátil |
| B17 | **Guía de estilo escrita, aplicada y versionada** [F1 4.2; F3 5.2.3; F17] | Está repartida en comentarios de `index.css` y `Prioridad.tsx`, en U1 §9 y en `08` §8.4 | Este documento más U1 §9 forman la guía. La `GuiaEstilo` firmada (P1 §1.15) la vuelve configuración | Media |
| B18 | **El activo evalúa al HMI del proveedor contra su propia filosofía** [F3, Introducción] | La paleta está fija en el código | La `GuiaEstilo` `'sitio'` configurable (P1 §1.13), con la lista de §6 como evaluación | Media |
| B19 | **Banda normal perceptible** [F18 1.4.11] | La banda es `--tinta3` al 30 %: 1,34:1 sobre el panel claro y 2,31:1 sobre el oscuro | Banda tenue más una raya de 1 px en `--tinta3` en cada extremo (6,48:1 y 5,40:1). Ver §5.1 | Baja |

---

## 3. La jerarquía de 4 niveles en TRIM, por rol

### 3.1 Las reglas de la jerarquía

Salen de ISA-101 6.3 e IEC 63303 7.3, cuya estructura está verificada [P: F1, F3]. El contenido de cada nivel sale de Hollifield [S: F5, F6] y de Rockwell [S: F17], y lo que lleva la vista general, de EEMUA 201 [S: F16].

| Nivel | Qué es | Qué lleva | Qué no lleva |
|---|---|---|---|
| **1 · Vista general** | Todo lo que el usuario tiene a cargo, **en una sola vista**, para un vistazo frecuente | Los indicadores clave con su contexto (meta, rango). Las alarmas de las 2 o 3 prioridades más altas. El estado de los equipos mayores. Las tendencias de lo importante. El caudal y el balance (lo que entra contra lo que sale) | El detalle de un equipo, las tablas largas y los controles. Desde el nivel 1 no se opera |
| **2 · Unidad** | Una parte del proceso; **la pantalla donde se trabaja** a diario. Se diseña primero [F17] | Todo lo que hace falta para la mayoría de las tareas de esa parte: indicadores, marcas y tendencias embebidas | Las cifras corporativas y el diagnóstico de un instrumento |
| **3 · Equipo** | Un equipo o una lógica | Todos sus instrumentos, **el estado del interlock** y lo necesario para diagnosticar. Aquí sí puede parecerse a un P&ID [F6] | La vista de conjunto |
| **4 · Soporte y diagnóstico** | Un punto, un sensor, una parte | El detalle de un punto, la salud del instrumento, la lógica, la ayuda y la documentación. IEC 63303 trae un ejemplo, «Health diagnostic» [F3, anexo B] | Nada que haga falta para operar ahora |

**Reglas que van con la jerarquía:**

- La navegación es lógica y **la misma en todas las pantallas** [F5]. En la guía de Rockwell, la barra para ir a los niveles 2 y 3 está en las pantallas de los niveles 1, 2 y 3 [F17].
- Desde una marca de alarma se llega con **un clic** a la pantalla donde se actúa [F8].
- **Cuatro niveles bastan** [F5, F17]. Si parece que hace falta un quinto, lo más probable es que el nivel 2 esté mal partido (interpretación de `12-estandar` §A.3, no de la norma).
- Existen además **pantallas de tarea para la situación anormal** [F5]. En TRIM son Identificar, la Entrega de turno y el Cierre del día (§3.4).

En TRIM, **el alcance cambia con el rol**: un campo (supervisor y operador), los campos asignados (producción y confiabilidad), todo el portafolio (jefe, gerente y regulatorio), o las órdenes propias (técnico).

### 3.2 Roles técnicos (tipo SCADA)

| Rol · alcance | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 | Lo que falta |
|---|---|---|---|---|---|
| **sup** · Supervisor · un campo | **No existe**. Lo más cercano son las cabeceras de Bombas y de Turno. Propuesto, «Mi campo ahora»: la franja de condiciones (§3.5); la tubería del campo en corto; «se deja de producir ahora» (hoy, «Perdiéndose ahora»; X4 §3.1, regla 4) con su tendencia de 7 días; el estado de las bombas críticas (en marcha, en reserva, parada, disparada); «qué limita hoy» y «lo más frágil» | Bombas · Electrosumergibles · Pozos | Ficha del equipo (P-201B: «no arrancar», colchón, orden de cierre, fuera de banda) · Detalle del pozo | Serie de un instrumento · «De dónde sale el dato» (`CadenaDato`) · Historia del PLC (primera alarma) · WhatsApp y SAP del equipo | El nivel 1. Tendencias en las placas (B6). Relleno por estado (B4) |
| **oper** · Operador · su ruta, en el teléfono | La primera vista del teléfono, «Ahora en mi campo»: qué está parado, qué no se arranca, a dónde ir y qué falta contestar. Hoy: Bombas, más el aviso de Identificar | Bombas · Electrosumergibles | Ficha en nivel operación, sin vigía ni salud por parte (`08` §8.12) | **No tiene**: el diagnóstico no es de su nivel | La franja de condiciones arriba, del mismo tamaño en todas sus pantallas |
| **tec** · Técnico · sus órdenes | **Mi trabajo**: órdenes a su nombre y equipos avisando. Ya funciona como nivel 1 de su alcance | Bombas · Electrosumergibles, para ubicar el equipo y ver cómo está | Ficha del equipo · Cierre de la orden con fotos y mediciones (U1 §8.2) | Historia del equipo · Catálogo de daños (lectura) | Relleno por estado y marcas consistentes |
| **jefe** · Jefe de mantenimiento · todos los campos | **Mantenimiento**. Hoy reparte su nivel 1 en seis paneles, con el ciclo arriba y dos cifras grandes. Propuesto: la franja de condiciones del portafolio, «qué intervenir», lo parado ahora y la tendencia de 12 meses del diferido por falla contra el máximo | Riesgo («Si falla hoy») · Bombas · Electrosumergibles · Superficie · Confiabilidad · Diferidos | Ficha con salud por parte (K-101) | Vigía (serie y proyección) · Aciertos · Órdenes y horas en SAP · Catálogo de daños | Tendencia en el nivel 1. La prioridad de la tarea, sin la marca del equipo (B10) |
| **conf** · Confiabilidad · sus campos | **Hoy entra por Bombas, una pantalla de grupo y no una vista general.** Propuesto, «Salud de la flota»: equipos por condición, los próximos cruces del vigía, lo que más cuesta si falla y «¿acierta el vigía?» como tendencia | Bombas · Electrosumergibles · Riesgo · Planta · Agua | Ficha con VIGÍA y SALUD POR PARTE | Serie larga y proyección · Aciertos · Catálogo · Filosofía (solo lectura) | El nivel 1 |
| **prod** · Producción · sus campos | **Producción**. Hoy mide 3.278 px y mezcla los niveles 1, 2 y 4. Propuesto, en una vista: la cabecera (real contra meta, potencial), la tubería del campo, la franja de condiciones y «se deja de producir ahora» | Planta (esquema) · Agua · Pozos · Electrosumergibles · Diferidos · «Qué limitó, día a día» y «Día a día» (que hoy están dentro de Producción) | Pozo (LC-21) · Tramo de la tubería · Equipo | Factor de asignación · Cuadre diario · Carga de la asignación oficial · Filosofía operacional | Partir Producción en dos niveles |

El administrador (`adm`) y la planeadora (`plan`, versión 2) no entran en este encargo. El administrador trabaja en pantallas de tarea (Configuración, Filosofía, Conectores) y en el nivel 2 de Planta.

**Coherencia con la arquitectura nueva de X4.** La tabla de arriba pone en niveles **las pantallas de hoy**, que es lo que pide el encargo. X4 §5.1 propone la arquitectura que viene, y la norma la respalda mejor que las pantallas actuales:

- **N1**: «La planta viva» con lente técnica.
- **N2**: el tren o el área (pozos, crudo, agua, gas, servicios), que es la «unidad» de Hollifield [F5].
- **N3**: el equipo. Allí **cada placa de bomba es un nivel 3**, porque es un solo equipo con sus variables [F5].
- **N4**: el diagnóstico, con dirección propia.

La pantalla de Bombas de hoy, con las placas de varias bombas iguales lado a lado, es lo que IEC 63303 llama **pantalla de grupo** (anexo B, «Group example») y Hollifield, **nivel «1,5»**: una vista general de equipos que deberían comportarse igual, para que el que se sale salte a la vista [F3, F5]. Sirve como índice del N3 (la pestaña Equipos de X4) si sus placas siguen la regla de §5.1, punto 10.

«Hoy» (X4 §3.3) es una **pantalla de tarea** (§3.4) y no un nivel. La única condición es que lleve la franja de condiciones y las mismas marcas.

### 3.3 Roles gerenciales: el nivel 1 como «la planta y el proceso»

**Por qué se puede, según la norma:**

- El nivel 1 de ISA-101 es «todo lo que el usuario tiene a cargo, en una vista». Para el gerente eso es el portafolio.
- EEMUA 201 dice qué lleva una vista general [F16]:
  - el caudal;
  - **el balance** entre lo que entra y lo que sale;
  - **el estado de los equipos críticos**: en línea, en reserva o disparados;
  - **las partes que más pesan** en el resultado.
- En TRIM, eso es la cadena del valor: yacimiento → pozos → planta o estación → afuera → venta, con **dónde se están quedando los barriles**.
- IEC 63303 reconoce los tipos de usuario y la formación de la gerencia (cláusulas 4 y 10.6) [F3]: la norma no es solo para la consola.

**Por qué no es un dibujo de la planta:**

- Hollifield es explícito: el nivel 1 no se parece a la planta, igual que el tablero del carro no se parece al motor [F5].
- Por eso el nivel 1 del gerente es un **diagrama funcional de 4 o 5 bloques**, la «tubería del campo» de U2 §2.3, y no un esquema de equipos.
- Los equipos aparecen **solo por excepción**: parados, disparados o en riesgo, con la misma marca que ve el técnico.

**Antes · Durante · Después**, como los tres momentos de la conciencia de situación. ASM la define así: orientarse a la presencia y el lugar del disturbio, comprender su naturaleza y **proyectar** su efecto [P: F12].

| Momento | Pregunta del gerente | Nivel de conciencia | Qué se dibuja sobre la tubería | Calidad del dato |
|---|---|---|---|---|
| **Durante** | «¿Dónde se están quedando los barriles ahora?» | Percepción | Lo que pasa hoy contra lo que cabría, por tramo, y el tramo que limita, con su marca gris «limita» (U2 §0, regla 4) | Medido: trazo continuo |
| **Después** | «¿Dónde se trabó en el período, y con qué equipos?» | Comprensión | Los barriles del período por tramo, con «sin identificar» aparte (U2 §2.3) | Medido o calculado: continuo, con el rótulo «calculado» y su rango |
| **Antes** | «¿Qué viene, y cuánto me costaría?» | Proyección | Los equipos en riesgo y «si falla hoy» sobre su tramo, más el cierre proyectado | Proyectado o simulado: **trazo discontinuo** y la palabra «simulado» o «proyectado» |

| Rol | Nivel 1 | Nivel 2 | Nivel 3 | Nivel 4 |
|---|---|---|---|---|
| **ger** · Gerente de activo | **«La planta y el proceso» del portafolio.** Lleva: la tubería de valor con lo que pasa contra lo que cabría; dónde se perdió el período, por tramo; producción y diferido contra meta, en barras grises tipo *bullet* (§5.2); los equipos críticos por excepción; la tendencia de 12 meses. Hoy, Resumen son cifras y listas, y el dibujo de la tubería vive en la Planta de producción, que el gerente no tiene | **El campo**: la misma vista para un campo. Hoy: Resumen y Diferidos del campo, con «Por dónde se trabó» | **El equipo que más pesa**, dicho para el gerente: qué se está haciendo, cuánto le ha costado y cuándo vuelve. Ya existe en `#/ger/resumen/ceiba/cerrado/P-201B` | **Sin diagnóstico** (U2 §3.2: el gerente no ve detalle técnico). Su nivel 4 es el soporte: el informe con folio, los planes de acción y la firma de metas |
| **reg** · Cumplimiento regulatorio | **«Cumplimiento hoy»**: si se puede publicar, el reloj del cierre (el corte de las 05:00 y la hora de corrección) y las filas listas y las que faltan, por campo. Hoy es la cabecera de Regulatorio («No se puede publicar todavía») | El árbol de causas por campo, en el orden de la circular · Los puntos de medición oficial | Una parada: su fila de `paradas_pozo`, con los 6 pasos y la evidencia | El archivo que se entrega · PRODML · Calibraciones · Historial de envíos |
| **cont** · Abastecimiento (versión 2, apagado en el MVP) | Las paradas que se trabaron **afuera** (oleoducto, cliente), con su costo | Por tercero o por contrato | La línea de tiempo del PLC de una parada | La evidencia exportada |

**Reglas del nivel 1 gerencial** (lo que lo separa del técnico, y lo que comparten):

1. **Cuatro o cinco bloques funcionales**, de izquierda a derecha en el orden físico. Sin tags y sin valores de instrumentos.
2. **El alto de cada tramo es proporcional a su capacidad, con el eje desde cero** (U2 §2.3). La palabra «limita» y el número mandan; el dibujo acompaña.
3. **Los equipos solo aparecen por excepción**, con la misma marca y el mismo color que en las pantallas técnicas.
4. **Cada cifra lleva su contexto** (meta o máximo, en barra gris) **y su calidad** (medido, calculado o simulado).
5. **El horizonte es el período**: el mes en curso, el cerrado o los 12 meses. «Ahora» es solo una franja.
6. **Del nivel 1 al equipo que más pesa hay dos clics.**
7. **El nombre.** Ninguna norma pide la palabra «gemelo digital»: ISA-101 e IEC 63303 hablan de «Level 1 display». El brief recuerda que esa palabra está reservada para otra línea (`01-propuesta-de-valor` §1.6). Recomiendo llamar la pantalla «La planta» o «El proceso», en línea con X4 §4.1 y X1 §4.3: la puerta se llama «Planta» y la vista, «La planta viva». Decide el dueño.

### 3.4 Pantallas de tarea (fuera de la escalera)

Hollifield pide pantallas hechas para responder a una situación anormal concreta [F5]. En TRIM son:

- **Identificar**: la cadena de una parada;
- la **Entrega de turno**;
- el **Cierre del día** para la ANH;
- **Configuración y Filosofía**: la tarea del administrador.

Usan la misma paleta y las mismas marcas. Desde cualquier marca se llega con un clic a la ficha del equipo (nivel 3).

### 3.5 La franja de condiciones (el resumen de alarmas)

ISA-18.2 pide una pantalla de resumen de alarmas, y IEC 63303 trae un ejemplo en su anexo B, «Alarm summary» [F3, F8]. Hoy TRIM tiene tres piezas sueltas: la franja de Planta («2 detenidos o en alarma»), «Pasando ahora» y «Perdiéndose ahora». La propuesta es **una sola franja**, igual en todo nivel 1, 2 y 3:

- **Siempre arriba y en el mismo lugar**: en el escritorio, bajo la cabecera; en el teléfono, primera fila.
- **Una cuenta por condición, de la más grave a la más leve**: interlock, alarma, atención y aviso. Al final y aparte va «sin comunicación», que no es una prioridad. Lo normal no se cuenta.
- **Cada cuenta lleva su forma, su cantidad y su palabra**, por ejemplo: rombo «1», «2 alarmas»; triángulo «2», «1 en atención». **La cantidad va fuera de la forma, con su palabra**: el dígito de dentro es la prioridad y no se puede leer como un conteo (X1 §3.4).
- **Cada cuenta abre la lista filtrada** y cada fila de la lista abre el equipo (un clic).
- **El gerente ve la misma franja**, sumada por campo.
- **Está vacía cuando no hay nada**: «nada anormal», en gris. Una franja que siempre tiene algo pierde valor (ISA-18.2, alarmas viejas).

---

## 4. La paleta funcional exacta

### 4.1 Cinco decisiones

1. **Cuatro tonos de estado y nada más.** Son los cuatro de Adair: rojo, naranja, amarillo y morado. Todo lo demás es gris.
   - Con ese número, los cuatro se separan bien con daltonismo (§4.5).
   - El azul **sale de los estados**: hoy `--p4` está definido y nadie lo usa (R4 §5.1).
   - El azul queda para la **interacción** (el foco y lo seleccionado, con `--acento`). Así ningún color dice dos cosas: un anillo azul de foco no se confunde con un diagnóstico, y el azul no se funde con el morado (2,3 con deuteranopía en oscuro).
2. **El rojo es solo del interlock**, como pidió Adair, y ISA-18.2 pide trato propio para las alarmas del sistema de seguridad [F8].
   - **El rojo del tema claro se oscurece**: de `#b71c1c` a `#8b1a1a`, para separarlo del naranja. Con daltonismo, el peor par rojo-naranja sube de 2,9 a 12,8.
3. **La alarma de prioridad 1 es naranja y va sola en su color. La 2 (atención) y la 3 (aviso) comparten el amarillo** y se separan por la forma (triángulo o cuadrado), el número y la palabra.
   - **Esto difiere de U1 §9.2 y de X1 §4.0**, que hacen compartir el naranja a la 1 y a la 2. Lo decide Adair; el resto de esta guía vale con cualquiera de las dos opciones (§8).
   - La razón: en un sistema sano la prioridad alta es cerca del 5 % de lo que se anuncia, y la media y la baja suman el 95 % [F8]. Si la 1 comparte color con la 2, el naranja deja de ser raro y pierde su fuerza. Ver §8.
4. **El morado significa una sola cosa: «no le crea a este número».** Lo usan dos condiciones:
   - «sin comunicación», con un círculo punteado;
   - «dato inválido», con un círculo punteado con raya.

   De acuerdo con U1 §9.2 y P1 §1.13. «Falta», «sin instrumento», la medición por campaña y la proyección del vigía van en **gris**.
5. **El diagnóstico del vigía no lleva color propio.** Una proyección es una alerta en el sentido de ISA-18.2 (2016), no una alarma [F10].
   - Si cruza dentro del tiempo de respuesta, toma la prioridad que le da la matriz (§4.2, nota): por ejemplo, el triángulo de «cruza la alarma en 43 h».
   - Si no, va en gris con la palabra «anticipa».
   - **Esto difiere de U1 §9.2**, que le daba azul (§8).

### 4.2 Las condiciones: color, forma, texto y nombre accesible

**Regla general:**

- **El color va en la marca.** El texto va siempre en tinta (`--tinta` o `--tinta2`) [F6].
- La marca se dibuja en un cuadro de 14 × 14. Mide como mínimo 12 px en el escritorio y 16 px en el teléfono.
- En listas y fichas, **la palabra va siempre al lado**. En un esquema puede ir sola la marca, y entonces la palabra va en el globo y en el nombre accesible (U1 §9.3).

| Condición | Cuándo | Claro | Oscuro | Forma (en 14 × 14) | Texto visible (palabras de campo) | Nombre accesible |
|---|---|---|---|---|---|---|
| **Normal** | Nada anormal | Sin color: el dato en `--tinta`. En listas mixtas, punto `--tinta3` `#4d535a` | Punto `#c8cbce` | Punto de radio 2,6 (el de hoy) | Nada. «En marcha» no se escribe | «Normal» |
| **Interlock** (enclavamiento) | El equipo está detenido **y** su primera alarma está en `Config.protecciones`, **o** el lazo SIS reporta disparo (P1 §2.9). TRIM no inventa un interlock | `#8b1a1a` | `#ff8080` | **Candado**: cuerpo `<rect x="2.5" y="6" width="9" height="7" rx="1.2"/>` relleno y arco `<path d="M4.6 6 V4.4 a2.4 2.4 0 0 1 4.8 0 V6" fill="none" stroke-width="1.6"/>` | «Interlock · baja succión (PSL-2011)» | «Interlock: baja succión, PSL-2011» |
| **Alarma** (prioridad 1) | Prioridad 1 que manda el motor (nota) | `#bf4000`, número blanco | `#ffb347`, número `#1f2328` | Rombo con «1» (el de hoy) | «Alarma · P-201B parada · 1.665 bbl/d» | «Prioridad 1 · alarma» |
| **Atención** (prioridad 2) | Prioridad 2 | `#f9a825` con **trazo `#1f2328` de 1 px**, número `#1f2328` | `#fff176`, número `#1f2328` | Triángulo con «2» (el de hoy) **más el trazo oscuro** | «Atención · succión fuera de banda · cruza la alarma en 43 h» | «Prioridad 2 · atención» |
| **Aviso** (prioridad 3) | Prioridad 3: fuera de meta, tendencia lenta | igual que atención | igual que atención | Cuadrado con «3» (el de hoy) | «Aviso · producción bajo la meta» | «Prioridad 3 · aviso» |
| **Bloqueo de procedimiento** («No arrancar hasta identificar») | Equipo parado cuya causa todavía nadie identificó: es una regla de operación, no una protección del PLC ni una prioridad | Sin color: `--tinta` | Sin color: `--tinta` | «⊘»: círculo con barra, en tinta. Va como franja fija arriba de la ficha y de la tarjeta. Hoy lleva el triángulo naranja de prioridad 2 | «No arrancar hasta identificar qué se dañó» | igual. De acuerdo con X4 §5.6, punto 4: no se confunde con el candado rojo |
| **Sin comunicación** | Sin dato del PLC o del historiador por más que la vigencia del tag (pedido §7; P1 §8.4, pregunta 27) | `#8420a3` | `#c99cff` | Círculo punteado: `<circle cx="7" cy="7" r="5.2" fill="none" stroke-width="1.6" stroke-dasharray="2.2 1.6"/>` (el `DatoInvalido` de hoy) | «Sin comunicación desde 14:07». **El valor pasa a «---»**, nunca el último leído como si fuera de ahora [F15 1.1-21] | «Sin comunicación desde las 14:07» |
| **Dato inválido** | El dato está fuera del rango del instrumento, o no corresponde a nada (un pozo que no existe) | `#8420a3` | `#c99cff` | Círculo punteado **con raya**: además, `<path d="M3.3 10.7 L10.7 3.3" stroke-width="1.6"/>` | «Dato inválido · fuera del rango del instrumento (0–300 psi)» | «Dato inválido: fuera de rango» |
| **Falta** | Paso sin respuesta, dato que nadie cargó, precio o meta sin firmar (P1 §1.13, `MarcaFalta`) | `--tinta3` | `--tinta3` | Rectángulo de contorno discontinuo: `<rect x="1.5" y="3" width="11" height="8" rx="1" stroke-dasharray="2 1.5"/>` | «falta la causa», «falta precio», «falta confirmar» | «Falta: la causa» |
| **Sin instrumento** | Equipo configurado que no tiene instrumento | `--tinta3` | `--tinta3` | Corchetes «[ ]» (los de hoy) | «sin instrumento · se supone en marcha» | igual |
| **Medido en campaña** | Lectura manual cada cierto tiempo (termografía, vibración) | `--tinta3` | `--tinta3` | Reloj: `<circle cx="7" cy="7" r="5.2" fill="none"/>` y manecillas `<path d="M7 4 V7 H9.5"/>` | «medido a mano hace 42 d» | igual |
| **Proyección o diagnóstico** | El vigía anticipa, fuera del tiempo de respuesta | `--tinta3` | `--tinta3` | Flecha «→» antes del plazo | «anticipa · cruza en 33 d», «3 partes estables» | igual |
| **Simulado o proyectado** | Cifra que no se midió (retorno del ciclo, cierre proyectado) | `--tinta2` | `--tinta2` | Trazo discontinuo en gráficas; la palabra junto a la cifra, **del mismo tamaño que la unidad** | «simulado», «proyectado» | igual |

**Nota sobre la prioridad.** ISA-18.2 dice que la prioridad sale de **la consecuencia y el tiempo para responder**, y que la fija la filosofía, no la pantalla [F8].

- En TRIM, la consecuencia ya la calcula el motor: los bbl/d en juego y «si falla hoy».
- El tiempo también: el colchón del tanque y las horas al cruce.
- La matriz que convierte esos dos números en 1, 2 o 3 es una decisión firmada de la operadora, para validar con Edinson y Adair. Esta guía no pone sus umbrales.
- La pantalla **pinta** la prioridad que llega (B15).

**Distribución esperada.** Con tres prioridades, cerca del 5 % de lo que se muestra debería ser de prioridad 1 y el 80 % de prioridad 3 [F8]. Si en el demo las marcas de prioridad 1 son mayoría, sobra prioridad 1. Hoy pasa en Bombas: 7 rombos contra 2 triángulos y 1 cuadrado, por B9.

### 4.3 Estados del equipo (en el esquema, en la cabecera de la ficha y en las listas)

Se codifican **por brillo, con una palabra y con la marca de su condición** [F5, F17]. El cuerpo del símbolo dice qué hace el equipo. La marca, en una esquina fija (arriba a la izquierda, fuera del cuerpo), dice si algo anda mal.

| Estado | Relleno del cuerpo | Contorno | Palabra (bajo el código) | Marca |
|---|---|---|---|---|
| **En marcha** | `--eq-marcha`, más claro que el fondo | continuo, `--eq-trazo`, 1,5 px | Solo el código: «P-201A» | Ninguna, o la de su alarma si la tiene (por ejemplo, K-101 en marcha y degradado: rombo) |
| **Parado normal**: en reserva, programado o cerrado por otro equipo | `--eq-parado`, más oscuro que el fondo. El detalle interno va en `--eq-marcha` | continuo, 1,5 px | «parado · en reserva», «parado · programado», «cerrado por P-201B» | **Ninguna**. Un pozo cerrado por otro equipo no lleva marca propia: la lleva el equipo que lo cerró (es consecuencia, no falla; `tipos.ts`, `Marcha`) |
| **Parado anormal**: por falla, sin causa o disparado sin protección registrada | `--eq-parado` | continuo, **2 px** | «parado · 1.665 bbl/d» | La prioridad que le da el motor: rombo, triángulo o cuadrado. **Sus variables no llevan marca propia** (B9) |
| **Disparado por protección** (interlock) | `--eq-parado` | continuo, **2 px** | «Interlock · baja succión (PSL-2011)» | Candado rojo |
| **Sin comunicación** | **Igual al fondo**: sin relleno, porque no se sabe si corre [F5] | discontinuo | «sin comunicación desde 14:07» | Círculo punteado morado |
| **Sin instrumento** | Igual al fondo | discontinuo, `--tinta3` | «sin instrumento» | Ninguna (hoy: «configurado, sin datos») |
| **Arrancando o parando** (solo si el PLC lo da) | Mitad clara y mitad oscura, partido en diagonal | continuo | «arrancando», «parando» | Ninguna |

Lo que hoy no se sabe distinguir: el motor no separa «parado normal» de «parado anormal» (`Marcha` = en-marcha · detenido · cerrado-por-otro · sin-lectura). Ver §7.

### 4.4 Los tokens

**Los valores de abajo son para los fondos de hoy.** Si el dueño elige una dirección de identidad de X1 (X1 §4), rigen los valores de X1, medidos sobre sus propios fondos. X1 llega a lo mismo por otra vía: aclara el naranja y le pone trazo, en vez de oscurecer el rojo, y logra 17,5 con deuteranopía. **Lo que fija esta guía es la regla y el umbral** (§6, C6 y C7), no el código de color.

Los fondos, la tinta y las líneas **no cambian**: ya pasan (X1 §3.5; `index.css:80-120`). Cambian o se agregan estos:

```css
:root{
  /* Estado · un color, un significado (X2 §4). Nada de esto se usa para decorar. */
  --interlock:#8b1a1a;   --interlock-f:#f0dada;   /* candado: la protección paró el equipo (antes era la P1, #b71c1c) */
  --p1:#bf4000;          --p1-f:#f5e2d4;          /* alarma (rombo «1»); es el naranja de la P2 de hoy */
  --p2:#f9a825;          --p2-f:#f6eed4;          /* atención (triángulo «2»), con trazo oscuro */
  --p3:#f9a825;          --p3-f:#f6eed4;          /* aviso (cuadrado «3»), con trazo oscuro */
  --sincom:#8420a3;      --sincom-f:#f0e3f4;      /* no le crea a este número: sin comunicación y dato inválido */
  --invalido:var(--sincom);                       /* alias, para no romper lo que hoy usa --invalido */
  --marca-num:#ffffff;   --marca-trazo:#1f2328;   /* número dentro del rombo; trazo y número del amarillo */
  /* Equipos (por brillo) */
  --eq-marcha:#fafaf9;   --eq-parado:#686c71;     --eq-trazo:#5c6066;   /* sin dato: sin relleno */
  /* Indicador analógico */
  --banda:#cdccca;       /* la banda normal; sus extremos llevan una raya de 1 px en --tinta3 */
  /* --p4 se elimina: el azul no es un estado. --acento queda solo para el foco y lo seleccionado. */
}
:root[data-theme="dark"]{
  --interlock:#ff8080;   --interlock-f:#4a2a2a;
  --p1:#ffb347;          --p1-f:#473425;
  --p2:#fff176;          --p2-f:#433d25;
  --p3:#fff176;          --p3-f:#433d25;
  --sincom:#c99cff;      --sincom-f:#3b3149;
  --marca-num:#1f2328;   --marca-trazo:#1f2328;
  --eq-marcha:#d9dcdf;   --eq-parado:#1f2225;     --eq-trazo:#aaadb0;
  --banda:#5d6165;
}
```

**Lo que cambia en `Prioridad.tsx`** (solo descrito; el código no se toca en esta fase):

- **El trazo oscuro y el número oscuro** pasan de `s === 3` a `s >= 2`, porque el triángulo ahora es amarillo.
- **Se suman las formas nuevas**, todas detrás de un punto de entrada único, `MarcaCondicion` (U1 §9.4, punto 3):
  - candado (`--interlock`);
  - círculo punteado con raya (dato inválido);
  - reloj (campaña);
  - rectángulo discontinuo (falta);
  - flecha (anticipa).
- **`Sparkline` y `Analogico` no cambian de token**: siguen leyendo `var(--p${s})`.
- **El orden para elegir una sola condición** por equipo es el de P1 §2.9: sin comunicación → dato inválido → interlock → 1 → 2 → 3 → anticipa → campaña → normal.

### 4.5 Contraste y daltonismo, medidos

Medido con `SCR/scripts/paleta.mjs`. El script reproduce los números de X1 §3.5 sobre la paleta de hoy.

- **Contraste**: WCAG 2.2, luminancia relativa [F18].
- **Separación**: OKLab × 100, con visión normal y con la simulación de Machado, Oliveira y Fernandes (2009, severidad 1,0) [F20]. Con menos de 5 dos colores se confunden; desde 10, se separan a simple vista (el mismo umbral de X1).
- **Fondos**: suelo, superficie, panel, panel2 y elevado.
- **Exigencia**: forma de estado ≥ 3:1 contra el fondo (1.4.11); número dentro de la forma ≥ 4,5:1 (1.4.3).

**Tema claro (propuesta):**

| Condición | Color | suelo | superficie | panel | panel2 | elevado | Mínimo | Número dentro |
|---|---|---|---|---|---|---|---|---|
| Interlock | `#8b1a1a` | 5,60 | 6,33 | 7,74 | 7,05 | 8,37 | **5,60** | — (sin número) |
| Alarma 1 | `#bf4000` | 3,21 | 3,62 | 4,43 | 4,04 | 4,79 | **3,21** | 5,3 (blanco) |
| Atención 2 y aviso 3 | `#f9a825` | 1,19 | 1,34 | 1,64 | 1,50 | 1,78 | 1,19 → **el trazo `#1f2328` da 9,53 a 13,16** | 8,0 (`#1f2328`) |
| Sin comunicación / inválido | `#8420a3` | 4,66 | 5,27 | 6,44 | 5,87 | 6,97 | **4,66** | — |
| Normal (punto) | `#4d535a` | 4,69 | 5,30 | 6,48 | 5,90 | 7,01 | **4,69** | — |

**Tema oscuro (propuesta):**

| Condición | Color | suelo | superficie | panel | panel2 | elevado | Mínimo | Número dentro |
|---|---|---|---|---|---|---|---|---|
| Interlock | `#ff8080` | 4,93 | 4,31 | 3,62 | 3,98 | 3,06 | **3,06** | — |
| Alarma 1 | `#ffb347` | 6,72 | 5,87 | 4,94 | 5,43 | 4,17 | **4,17** | 8,9 (`#1f2328`) |
| Atención 2 y aviso 3 | `#fff176` | 10,32 | 9,01 | 7,58 | 8,33 | 6,40 | **6,40** | 13,6 (`#1f2328`) |
| Sin comunicación / inválido | `#c99cff` | 5,52 | 4,82 | 4,06 | 4,46 | 3,42 | **3,42** | — |
| Normal (punto) | `#c8cbce` | 7,35 | 6,42 | 5,40 | 5,93 | 4,56 | **4,56** | — |

**Separación de los pares que importan**, hoy y con la propuesta. Es el peor caso de los cuatro tipos de visión; entre paréntesis va la deuteranopía, la forma más común. Siemens cita entre el 8 % y el 12 % de los hombres con daltonismo [F8]:

| Par | Claro hoy | Claro propuesta | Oscuro hoy | Oscuro propuesta |
|---|---|---|---|---|
| Interlock (rojo) · alarma (naranja) | 2,9 (4,7) ⚠ | **12,8 (14,0)** | 6,3 (8,7) ⚠ | **10,5 (10,8)** |
| Alarma (naranja) · atención/aviso (amarillo) | 23,9 (24,6) | 23,9 (24,6) | 7,9 (7,9) ⚠ | **11,4 (11,4)** |
| Alarma (naranja) · morado | 16,5 (26,7) | 16,5 (26,7) | 7,2 (21,1) ⚠ | **10,4 (26,9)** |
| Amarillo · morado | 32,1 (44,9) | 32,1 (44,9) | 7,9 (23,8) ⚠ | **17,4 (31,2)** |
| Morado · azul (P4 de hoy) | 3,2 (3,2) ⚠ | el azul ya no es estado | 2,3 (2,3) ⚠ | el azul ya no es estado |
| Morado · gris normal | 11,7 (12,2) | 11,7 (12,2) | 7,1 (7,1) ⚠ | 8,3 (13,5) ⚠ (solo con tritanopía, rarísima; además los separan el círculo punteado y el punto) |

**Equipos y banda:**

| Par | Claro | Oscuro |
|---|---|---|
| En marcha contra parado | **5,06:1** (hoy, `--eq-on` contra `--eq-off`: 1,94:1) | **11,61:1** |
| Parado contra el fondo del esquema (`panel2`) | 4,01:1 | 1,65:1. En oscuro manda el contorno, de 7,09:1 sobre el relleno y 4,29:1 sobre el fondo |
| Contorno contra el fondo del esquema | 4,80:1 | 4,29:1 |
| Raya de los extremos de la banda (`--tinta3`) contra el panel | 6,48:1 | 5,40:1 |
| Texto en tinta sobre el fondo de un chip de condición (`-f`) | de 11,85:1 a 13,62:1 | de 9,02:1 a 10,53:1 |

**Lo que queda flojo, dicho:**

- El amarillo del tema claro no llega a 3:1 contra ningún fondo gris claro, y **ningún amarillo que siga siendo amarillo** llega. Por eso lleva el trazo oscuro: la decisión de hoy, que se extiende al triángulo.
- El interlock oscuro queda justo en 3,06:1 sobre `--elevado`, el fondo de los menús.
- El parado oscuro se separa poco del fondo (1,65:1). Lo cubren el contorno y la palabra «parado».

**Para X1:** el acento oscuro de hoy (`#b5d3e9`) queda a 4,1 de la tinta gris `#c8cbce`. Lo seleccionado casi no se distingue de un texto gris en oscuro. Es un tema de identidad, no de estado.

### 4.6 Cómo entra

- **La guía entra entera, en un solo cambio**, el día que entre la `GuiaEstilo` (P1 §1.15): naranja para la 1, amarillo para la 2, el rojo reservado.
  - Aunque el interlock (`Enclavamiento`) llegue después, en F3, un rojo que todavía nadie usa no confunde.
  - **Un rojo que cambia de significado dos veces, sí.**
  - Esto ajusta lo que dice P1 §1.13 («hasta F3 rige la paleta de hoy»). Ver §8.
- **El papel sigue igual**: se imprime en claro, y la forma lleva la condición aunque el informe salga en blanco y negro [F15 1.3.8-10].
- **`scripts/verificar-libro.mjs` ya recalcula el contraste de los tokens** (comentario de `index.css`). Hay que sumarle `--interlock`, `--sincom`, `--eq-marcha`, `--eq-parado` y `--banda`, y la prueba de separación con daltonismo de `SCR/scripts/paleta.mjs`.

### 4.7 ¿Claro u oscuro por defecto?

ASM es la única fuente consultada que lo argumenta con factores humanos [P: F12]:

- recomienda **fondo gris claro junto con una sala bien iluminada**;
- con un fondo oscuro en una sala clara, o al revés, el ojo se readapta en cada mirada y se cansa en un turno de 12 horas;
- **la sala oscura baja el estado de alerta**, porque induce el sueño;
- y el fondo claro deja leer papel en la misma mesa.

Hollifield dice lo mismo: el gris facilita «a brightly lit control room» [F6].

**Recomendación:**

- **El tema claro (gris) va por defecto** en sala, en oficina y en el teléfono al sol.
- **El oscuro es una opción de cada persona**, no del turno de noche. Va siempre en gris oscuro, **nunca negro**, y con la misma semántica.
- Esto es lo que X1 deja pendiente en su §2.4.

---

## 5. Indicadores

### 5.1 El indicador analógico, con la banda normal (`Analogico`, niveles 2 y 3)

```
 Presión de succión · PI-2011                              ◆1  8,8 psi
 ├─────╫──┬────▕░░░░░░░░░░░░░░░░░░░░░░░░▏──────┬────────────────┤
            ▼
        disparo  alarma   banda normal 12 – 20            alarma
        8 (candado) 10                                      24
```

1. **Escala fija por instrumento.**
   - Va del rango declarado del instrumento, o, si no lo hay, de los disparos firmados más un margen (§7).
   - **Nunca depende del valor de ahora** (B7). Si el valor se sale de la escala, el puntero se queda en el borde con «◄» o «►» y el número dice cuánto.
2. **La banda normal se ve siempre**, también cuando el valor está adentro: es lo que deja ver la holgura [F5, F6]. Va en `--banda`, con una raya de 1 px en `--tinta3` en cada extremo (6,48:1 y 5,40:1; B19).
3. **Los límites**:
   - el de alarma, con una raya de 2 px en `--tinta2`, como hoy;
   - **el de disparo (interlock), con una raya doble y un candado chico**: Hollifield los distingue, porque son cosas distintas [F5, F6].
   - El límite que se cruzó puede tomar el color de su prioridad [F17].
4. **El puntero va siempre en `--tinta`.** No se pinta: el color va en la marca junto al valor (B5). Así el amarillo no necesita trazo en el puntero, y un banco de indicadores se lee por posición.
5. **El valor:**
   - va en `--tinta`, con cifras tabulares, los decimales del instrumento (`decimalesDe`; ISA-101 Tabla 7, cuyo contenido no se verificó) y la unidad más chica;
   - **cuando es anormal, va en negrita, con la marca a la izquierda**. Es la regla que ya cumple `FueraDeMeta`.
6. **Sin comunicación**: la escala va discontinua en `--sincom`, sin puntero, el valor es «---» y al lado va «sin comunicación desde 14:07» en `--tinta2`, con el círculo punteado morado.
7. **Dato inválido**: el puntero va hueco y el valor tachado, con «dato inválido · fuera de rango».
8. **Equipo parado** (supresión por estado): sus variables se ven en gris tenue con «parado» y **sin marca de prioridad propia**. La marca la lleva el equipo, una sola vez (B9).
9. **La prioridad la manda el motor.** Si no llega, no hay marca: la posición del puntero ya dice lo suyo (B15).
10. **En grupo:**
    - misma orientación, mismo largo y mismo orden en todos los equipos del mismo tipo;
    - en equipos gemelos (P-201A, B y C), **la banda normal en el mismo lugar**, para que «todo bien» se vea como una línea recta [F17 §6.5]. Hollifield agrupa la misma medida de varios equipos iguales para que el que se sale salte a la vista [F5, el ejemplo de los pulverizadores].
11. **La tendencia va en una segunda fila, opcional**: la minigráfica de §5.3.
12. **Nombre accesible**: «Presión de succión, 8,8 psi; normal de 12 a 20; alarma en 10; prioridad 1, alarma».

**El gerente no ve indicadores de instrumentos** (U2 §3.2). Su indicador es la barra contra la meta.

### 5.2 La barra contra la meta (`BarraMeta`, gerencial)

Es el equivalente gerencial del analógico. Coincide con el *bullet graph* de Stephen Few, pensado justamente para reemplazar los medidores en un tablero [P: F22]:

- **la cifra destacada es una barra oscura**;
- la comparación (meta o máximo) es **una raya corta perpendicular**;
- los rangos cualitativos son **de 2 a 3 intensidades de gris**, más oscuro lo peor, «rather than using distinct hues» por el daltonismo.

| Regla | Hoy | Qué hacer |
|---|---|---|
| Barra desde cero, porque es una cantidad (producción, diferido) | Sí, en `--dato-2`, 5,37:1 | Igual |
| La meta como raya, al 80 % del ancho; pasa hasta 1,25 veces | Sí (`08` §8.5) | Igual |
| Lo que se sale lo dice la marca junto a la cifra, no la barra | Sí, `FueraDeMeta` | Igual: cuadrado amarillo «3» |
| Rangos cualitativos en gris (opcional) | No hay | Si la operadora firma una tolerancia, se dibuja como 2 grises detrás de la barra. **Nunca rojo y verde** |
| Lo proyectado no es lo medido | El cierre proyectado se dibuja igual que lo medido | La barra del cierre proyectado, **rayada o solo con contorno**, y la palabra «proyectado» |
| Dónde se usa | Producción, diferido y cierre | Para tasas y totales contra algo firmado. **Nunca para una variable de proceso**: para eso está el analógico |

### 5.3 La tendencia (`Sparkline`, `Proyeccion` y las gráficas del libro)

1. **Embebida**: aparece sola, con su historia, al abrir la pantalla. No se pide [F5].
2. **La línea va en `--dato-1`, de 1,6 a 2 px.**
   - La banda normal va sombreada con `--banda`.
   - La meta y los límites van en raya discontinua `--tinta2`.
   - El último punto lleva un punto, o la forma de su prioridad si es anormal, como ya hace `Sparkline` [F5, F17].
3. **Un hueco corta la línea**: no se une por encima ni se pinta en cero. Ya se cumple (`Sparkline.tsx:4-8`).
4. **El tiempo crece hacia la derecha**, «hoy» va en el borde derecho y **la ventana va escrita**: «14 d», «12 meses».
5. **La ventana es el horizonte de la decisión del rol**:

   | Dónde | Ventana |
   |---|---|
   | Nivel 1 técnico | 7 días de lo que se deja de producir y de lo que sale por el punto de medición |
   | Placa de una bomba (pantalla de grupo hoy; nivel 3 en X4) | La serie del historiador del tag (por ejemplo, 14 d) |
   | Ficha de nivel 3 | La serie más la proyección del vigía, hasta 45 d, como `Proyeccion.tsx` |
   | Nivel 1 del gerente | 12 meses, mes a mes, y el mes en curso por día |

6. **La escala vertical incluye siempre la banda y los límites**, y no cambia en cada recarga.
7. **No más de 3 o 4 trazas por gráfica** [F5]. Si hay más (los 18 pozos), van en gráficas chicas iguales, una por pozo, o se resalta una en tinta y el resto en `--dato-4`.
   - Las series se separan **por gris y por trazo** (continuo, discontinuo, punteado). No llevan colores por categoría: el color es del estado.
   - Es lo que ya hace la Planta con las corrientes de fluido, y lo que piden U2 y `index.css:98-99`.
8. **Medido, en trazo continuo; calculado, continuo con su rango sombreado; proyectado o simulado, discontinuo**, con su palabra.
9. **Tamaño:**
   - 96 × 26 px solo en la ficha, como hoy;
   - en la placa de un equipo, al menos 150 × 28;
   - en el nivel 1, al menos 240 × 64, con la ventana escrita.

### 5.4 El estado de un equipo en el dibujo de proceso

1. **Símbolos en 2D**, con contorno de 1,5 px. **Sin sombra, sin halo y sin degradado** (B12) [F5, F17].
2. **El relleno dice el estado, por brillo** (§4.3). Hoy el relleno es el mismo para todos (B4).
3. **La caja no se tiñe.** El estado anormal se ve en tres cosas:
   - **la marca**, en la esquina de arriba a la izquierda, fuera del cuerpo;
   - **el borde de 2 px** en el color de la condición;
   - para la prioridad 1 y el interlock solamente, **el anillo**: es lo más raro y lo más grave.

   Hollifield llama «a poor practice» pintar el fondo [F6]. Hoy la caja se rellena con `--p*-f` (`Planta.tsx:407`).
4. **Los tanques**:
   - el nivel va como relleno gris, como hoy, nunca como una mancha de color;
   - **el alto y el alto-alto van como rayas en el costado**, con el número al lado [F5];
   - el «se llena en 1,8 h» va como texto.
5. **Las tuberías**:
   - van en gris, y el fluido se distingue por el trazo y el rótulo, como hoy;
   - **la dirección va con flechas fijas**;
   - sin flujo, la línea va tenue y con el rótulo «SIN FLUJO», como hoy.
6. **«Limita»** lleva contorno doble gris y «◄ limita», sin color (U2 §0, regla 4). De acuerdo.
7. **Un clic en el equipo abre su ficha** (nivel 3), en un panel que no tapa la franja de condiciones (B11).

### 5.5 El flujo animado: cuándo sí y cuándo no

**Nunca para decir que algo está corriendo**, en ningún rol, tampoco en el nivel 1 del gerente:

- Hollifield: «No animation except for specific alarm-related graphic behavior». Pone como defecto las bombas que giran y las bandas que se mueven [F5].
- ASM pone el movimiento entre las tres palancas de la relevancia visual, con la forma y el color [F12], y Hollifield explica que es la que se nota en la visión periférica [F5]: por eso se guarda para lo que pide atención.
- Una tubería que «fluye» todo el día es una alarma falsa permanente que gasta lo más escaso que tiene la pantalla.
- TRIM ya lo resolvió así (`index.css:144-147`). **La investigación previa** (`12-estandar` E.3, regla 6) **admitía «rotación de impulsor = bomba corriendo»**: eso contradice a Hollifield (§8).

**Nunca parpadeo.** El único parpadeo legítimo es el de la alarma no reconocida (ISA-18.2 [F8]), y TRIM no reconoce alarmas.

**Sí, en cuatro casos**, todos respetando `prefers-reduced-motion` (WCAG 2.3.3 [F18]; `index.css:131`):

1. **La transición de navegación**, de 200 ms o menos, al abrir un tramo, una ficha o un nivel. Da continuidad de lugar y no es un dato.
2. **El cambio de estado de un equipo** mientras alguien mira: el contorno pasa de 1,5 a 2 px **una vez**. Nada se repite ni late.
3. **«Repetir la parada», a pedido.** El usuario oprime ▶ para ver cómo se movió el flujo en una parada pasada. Sirve en Identificar y para que el gerente entienda dónde se trabó.
   - Tiene pausa, no va en bucle y termina sola.
   - Si dura más de 5 s, necesita pausa (WCAG 2.2.2 [F18]).
4. **Si algún día TRIM tuviera reconocimiento de alarmas:**
   - parpadea solo la marca, nunca el texto (NUREG 1.3.10-10);
   - en un área chica, a 2 o 3 por segundo (NUREG 1.3.10-12), sin pasar de 3 por segundo (WCAG 2.3.1);
   - y se apaga al reconocer.

**La dirección del flujo va con flechas fijas. La cantidad, con el número y el alto del tramo** (U2 §2.3), nunca con la velocidad de una animación.

### 5.6 Las cifras grandes, y el tamaño de la letra

1. **Una sola cifra protagonista por pantalla de nivel 1**: la que responde su pregunta («Se deja de producir ahora · 1.966 bbl/d»; el rótulo de X1 §4.0 y X4 §3.1). Como mucho, cuatro secundarias.
   - Hoy, el Resumen del gerente tiene **6 cifras de 24 px o más** en la primera vista (auditor) y la Entrega de turno, 5 (X1 §3.3).
2. **Nunca sola.** La acompañan:
   - **la unidad**, más chica;
   - **el contexto**: la barra contra la meta o la banda;
   - **la dirección**: una flecha y la diferencia contra su referencia, como «▼ 18 % frente a jun–ago»;
   - **la calidad**: medido, calculado o simulado;
   - **la vigencia**: «a las 14:00», «hasta el 2 de oct» [F15 1.1-21].
3. **Nunca en color.** Lo anormal va en la marca a su izquierda (`FueraDeMeta`).
4. **Cifras tabulares**, decimales fijos por magnitud (`08` §8.1) y alineadas a la derecha en columnas [F17 §6.8].
5. **Lo simulado nunca es más grande ni va más arriba que lo medido** (B14).
6. **Los totales y acumulados** (barriles del mes, horas de operación) pueden ir como número solo: no tienen rango normal (`12-estandar` §A.4).
7. **Tamaños.** Con Air, la mayúscula mide 0,698 del cuerpo (medido), y un píxel CSS son unos 1,28′ [F19]:

   | Uso | Tamaño mínimo | Minutos de arco de la mayúscula |
   |---|---|---|
   | Cifra protagonista | 32 a 40 px, Air Bold | — |
   | Cifras secundarias | 20 a 24 px | — |
   | **Valores y órdenes que el operador o el técnico leen en el teléfono, en campo** («No arrancar», el estado del equipo, el valor) | **18 px** | 16′: lo que pide NUREG 1.3.1-4 [F15] |
   | Datos que deciden, en el escritorio | 14 px (16 px en el nivel 1) | 12,5′ y 14,3′ |
   | Rótulos y metadatos | 12 px; los rótulos en mayúsculas condensadas, 11 px (X1 §4.0, punto 7) | — |
   | Nada | por debajo de 11 px | — |

   Hoy, entre el 60 % y el 90 % de los textos visibles miden menos de 12 px (B16). Este es el punto donde la norma más empuja a la identidad. X1 llega a lo mismo por otro camino.

---

## 6. Lista de comprobación para construcción y QA

**Cómo usarla:**

- Se aplica **a cada pantalla**: las 100 rutas del auditor (`e2e/auditoria/rutas.ts`), en sus 5 anchos y en los dos temas.
- **A** = automática, con Playwright, como el auditor de desbordes. **M** = manual, sobre una captura.
- La columna «Hoy» es la línea base que midió el prototipo `SCR/scripts/auditar-estilo.mjs` (`SCR/auditoria-estilo-linea-base.md`) o la que se ve en las capturas.
- Los umbrales con «TRIM» son propios: la norma no da número y aquí se fija uno que se pueda probar.

### 6.1 Color y condición

| ID | Comprobación | Cómo | Pasa si | Hoy | Fuente |
|---|---|---|---|---|---|
| C1 | Ningún texto se pinta con un color de condición | A: color calculado de cada texto visible contra `--interlock`, `--p1`, `--p2`, `--p3` y `--sincom` | 0 textos | 2 o 3 por pantalla («0 psi», «8,8 psi», la franja de Planta) | F6 |
| C2 | Toda forma con color de condición tiene nombre («Prioridad…», «Interlock…», «Sin comunicación…», «Dato inválido…») o es decorativa porque la palabra está en el mismo renglón | A | 100 % | Se cumple con `MarcaPrioridad` | F18 1.4.1 |
| C3 | Presupuesto de color: fracción de píxeles saturados en la captura | A: `capturas.mjs` | TRIM: ≤ 3 % en el demo y ≤ 0,5 % en una pantalla sin nada anormal (sin contar el logo) | 0,02–0,24 % en claro; 2,16 % en Planta oscura | F15 1.3.10-2 (≤ 10 %) |
| C4 | Ningún color de condición se usa para otra cosa: botones, enlaces, selección, series de una gráfica, marca | A: estilos con esos tokens fuera de los componentes de marca y de la franja | 0 | El rojo marca además «equipo parado» (B1) | F5; F15 1.3.8-9 |
| C5 | El azul (`--acento`) solo para el foco y lo seleccionado | M | Ningún estado en azul | `--p4` existe sin uso | §4.1 |
| C6 | Contraste: forma ≥ 3:1 contra los 5 fondos (o trazo oscuro); número dentro ≥ 4,5:1; texto ≥ 4,5:1 | A: `scripts/verificar-libro.mjs` más `paleta.mjs` | Todo | Pasa, salvo el amarillo sin trazo | F18 |
| C7 | Separación con daltonismo entre rojo, naranja, amarillo y morado | A: `paleta.mjs` | ≥ 10 en el peor caso, en los dos temas | 2,9 (rojo · naranja, claro) | F12; F20 |
| C8 | Impresa en blanco y negro, toda condición se sigue distinguiendo | M: captura con `filter: grayscale(1)` | Por forma y palabra | Se cumple en listas | F15 1.3.8-10 |

### 6.2 Forma, palabra y consistencia

| ID | Comprobación | Cómo | Pasa si | Hoy | Fuente |
|---|---|---|---|---|---|
| F1 | En listas y fichas, la marca lleva su palabra en el mismo renglón | A | 100 % | Casi siempre | U1 §9.3 |
| F2 | **Un mismo equipo tiene la misma condición en todas las pantallas al mismo tiempo** | A: recorrer las rutas del rol y juntar equipo → condición | Una sola por equipo | P-201B es P1 en Bombas, Riesgo y Turno, y P2 en Mantenimiento | F3 6.1.2 |
| F3 | Una sola condición por equipo, en el orden de P1 §2.9 | A | Sí | — | P1 §2.9 |
| F4 | Los dígitos 1–3 **dentro de una forma** son prioridad, y ningún rótulo vecino usa «1/2/3» | M | Sí | «1 Antes · 2 Durante · 3 Después» junto a las marcas (X1 §3.4) | §4.2 |
| F5 | Una tarea («sigue parado», «falta identificar») lleva la marca «falta», no la del equipo | M | Sí | No (B10) | §4.2 |

### 6.3 Equipos y dibujo de proceso

| ID | Comprobación | Cómo | Pasa si | Hoy | Fuente |
|---|---|---|---|---|---|
| E1 | El relleno del equipo sale de su estado: en marcha, parado, o sin relleno si no hay dato | A: accesorio con un equipo de cada estado | En marcha contra parado ≥ 3:1 | Un solo relleno para todos (1,94:1) | F5; F17 |
| E2 | Sin comunicación: el valor no muestra dígitos y dice «desde HH:MM» | A: tag con valor `null` | «---» y la hora | «sin señal», sin hora | F15 1.1-21 y 14.3 |
| E3 | Equipo parado: sus variables no llevan marca propia | A: cuenta de marcas por equipo parado | 1 | 4 en la placa de P-201B | F8 |
| E4 | Sin sombra ni halo en el SVG del proceso | A: `svg [filter]` dentro del esquema | 0 | 9 en Planta | F5; F17 |
| E5 | La caja del equipo no se tiñe. Marca arriba a la izquierda. Anillo solo con prioridad 1 o interlock | M | Sí | Caja teñida | F6 |
| E6 | El interlock aparece solo con primera alarma registrada o con disparo del lazo SIS | A: accesorio | Sí | No existe | P1 §2.9 |

### 6.4 Indicadores

| ID | Comprobación | Cómo | Pasa si | Hoy | Fuente |
|---|---|---|---|---|---|
| I1 | La escala del analógico no se mueve cuando cambia el valor | A: el mismo tag con 3 valores; la banda normal debe quedar en la misma x | ±1 px | Se mueve (B7) | F17 §6.5 |
| I2 | Puntero y número en tinta; negrita si es anormal | A: color calculado | `--tinta` | Se pintan (B5) | F6 |
| I3 | Banda normal visible, con sus dos rayas de extremo. El disparo se distingue de la alarma | M | Sí | Banda de 1,34:1, sin rayas, sin disparo | F5; F18 1.4.11 |
| I4 | Tendencia: un hueco corta la línea, nunca se dibuja como 0 | A | Sí | Se cumple | `08` §8.10 |
| I5 | Cada tendencia dice su ventana y tiene ≤ 4 trazas | M | Sí | Ventana a veces implícita | F5 |
| I6 | En las placas de los equipos, cada variable principal lleva su minigráfica | A: cuenta de minigráficas contra placas | ≥ 1 por placa | 0 | F5; F16 |
| I7 | Lo proyectado o simulado va en trazo discontinuo, con su palabra, y nunca más grande que lo medido | M | Sí | El retorno simulado es el protagonista del gerente | F15 14.3-5 |

### 6.5 Jerarquía y navegación

| ID | Comprobación | Cómo | Pasa si | Hoy | Fuente |
|---|---|---|---|---|---|
| N1 | **El nivel 1 de cada rol cabe sin desplazar** en 1440 × 900 y 1280 × 800. En 390 px, la franja, la cifra protagonista y los 3 primeros asuntos caben en la primera vista | A: alto del contenido contra alto de la ventana | ≤ 900 px; ≤ 844 px | Producción 3.278 px; Resumen 1.806 px | F5; F17; F16 |
| N2 | La franja de condiciones existe, igual y en el mismo lugar, en todo nivel 1, 2 y 3 | A: un selector propio (p. ej. `data-franja`) | Sí | Piezas sueltas | F8; F3 anexo B |
| N3 | De una cuenta de la franja a la lista: 1 clic; de una fila a la ficha: 1 clic; de una marca del esquema a la ficha: 1 clic | A | Sí | Se cumple en Planta | F8 |
| N4 | Ninguna ruta pasa de 4 niveles (un cajón dentro de otro cuenta como nivel) | M | Sí | — | F5; F17 |
| N5 | La ficha no tapa la franja ni oscurece lo de atrás | A | Sí | Velo y 40 % tapado | F5 |
| N6 | El mismo lugar se llama igual en todos los roles | M | Sí | «Pozos y equipos», «Equipos», «Bombas de la línea» y «Superficie» (X1 §3.4) | F3 6.1.2 |

### 6.6 Cifras, letra y calidad del dato

| ID | Comprobación | Cómo | Pasa si | Hoy | Fuente |
|---|---|---|---|---|---|
| T1 | En la primera vista de un nivel 1, ≤ 1 cifra de 32 px o más y ≤ 4 entre 20 y 31 px | A | Sí | 6 cifras de 24 px o más en el Resumen | §5.6 |
| T2 | Todo valor numérico con `tabular-nums` | A: `font-variant-numeric` calculado | 100 % | Casi todo (`.tabular`) | §5.6 |
| T3 | Ningún texto bajo 12 px, salvo los rótulos en mayúsculas condensadas, que pueden ir a 11 px (X1 §4.0, punto 7). Los valores que deciden, ≥ 14 px en el escritorio y ≥ 18 px en el teléfono del operador y del técnico | A | Sí | Entre 60 % y 90 % bajo 12 px | F15 1.3.1-4 |
| T4 | Cada cifra lleva unidad, contexto, calidad y vigencia cuando le aplican | M | Sí | Parcial | §5.6 |
| D1 | Lo calculado dice «calculado» (y su rango si hay tolerancia); lo simulado, «simulado»; lo medido, nada | A | Sí | Se cumple (`08` §8.9) | F15 14.3-5 |
| D2 | «Sin comunicación», «dato inválido», «medido en campaña» y «falta» se ven distintos | A: accesorio con los 4 casos | 4 formas y 4 textos | Hoy son 1 o 2 | U1 §9.2; F15 14.3 |
| D3 | La pantalla dice hasta qué hora llegan los datos | M | Sí | En el papel | F15 1.1-21 |

### 6.7 Movimiento y guía de estilo

| ID | Comprobación | Cómo | Pasa si | Hoy | Fuente |
|---|---|---|---|---|---|
| M1 | Ninguna animación CSS ni SMIL, salvo transiciones de navegación de 200 ms o menos. Con `prefers-reduced-motion: reduce`, ninguna | A | Sí | 0 | F5; F18 2.3.3 |
| M2 | Nada parpadea | A | Sí | Se cumple | F8; F15 1.3.10 |
| M3 | «Repetir la parada» solo a pedido, con pausa y sin bucle | M | Sí | No existe | F18 2.2.2 |
| G1 | Todo cambio de token o de forma pasa por la `GuiaEstilo` firmada | M | Sí | Hoy viven en comentarios | F3 5.2.3 y 5.6.2 |
| G2 | Esta lista corre en CI sobre las rutas del auditor | A | Sí | Prototipo en `SCR/scripts/auditar-estilo.mjs` | F5 (paso 2: medir contra la filosofía) |

---

## 7. Pedidos al motor y a producto

El motor calcula y la pantalla pinta (BRIEF). Para que la pantalla cumpla esta guía sin deducir nada, el motor tiene que dar:

| # | Pedido | Para qué | Dónde se usa |
|---|---|---|---|
| 1 | **`Marcha` con subestados**: `en-reserva` y `programado` (del programa de paradas) separados de `detenido` (anormal); `arrancando` y `parando` si el PLC los da | Distinguir el parado normal del anormal sin poner color a lo normal | §4.3 |
| 2 | **`Enclavamiento`**: primera alarma más `Config.protecciones`, o el lazo SIS (P1 §1.13) | El rojo y el candado | §4.2; B3 |
| 3 | **Vigencia por tag** (cuántos minutos sin dato definen «sin comunicación») **y la hora del último dato** | «Sin comunicación desde 14:07» y el valor en «---» | §4.2; E2. P1 §8.4, pregunta 27, a Adair |
| 4 | **Rango del instrumento y umbral de disparo por tag** | La escala fija del analógico y la marca del disparo | §5.1; B7 |
| 5 | **La prioridad de cada condición**, desde una matriz consecuencia × tiempo firmada por la operadora | Que la pantalla no la deduzca | §4.2, nota; B15 |
| 6 | **Supresión por estado**: con el equipo parado, sus variables llegan como «parado», sin prioridad propia | Una sola marca por equipo parado | §5.1, punto 8; B9; E3 |
| 7 | **La calidad de cada cifra**: medido, calculado (con rango), estimado, simulado o proyectado | El trazo y la palabra | §4.2; §5.6; D1 |
| 8 | **La prioridad de una tarea, separada de la del equipo**, o sin marca | Que «sigue parado» no cambie la marca de P-201B | B10; F2 |

**A producto:**

1. La `GuiaEstilo` con `'trim'` y `'sitio'` (P1 §1.13), firmada y versionada.
2. **Pedir la guía de estilo HMI de la operadora piloto** (P1 §8.4, pregunta 25). IEC 63303 le pide al dueño del activo evaluar el HMI del proveedor contra la suya [F3].

**Tres preguntas para Adair** (se suman a la tarea A3 de X4 §7.4):

1. **Prioridad 2 en amarillo, compartido con la 3** (esta guía), **o en naranja, compartido con la 1** (U1 y X1).
2. **El candado** como forma del interlock, frente al «I» en un cuadro de las pantallas de Hollifield.
3. **Cuánto tiempo sin dato** es «falla de comunicación».

---

## 8. Desacuerdos

1. **Con U1 §9.2, P1 §1.13 y X1 §4.0: las prioridades 1 y 2 en el mismo naranja.** Propongo **la 1 sola en naranja, y la 2 y la 3 en amarillo**, separadas por forma, número y palabra.
   - **Por qué**: ISA-18.2 y EEMUA esperan cerca del 5 % de lo que se anuncia en prioridad alta, el 15 % en media y el 80 % en baja [F8]. Con la 1 y la 2 en el mismo color, una de cada cinco marcas sería naranja, en vez de una de cada veinte, y el naranja dejaría de ser raro, que es lo que lo hace servir.
   - Adair dijo «naranja con amarillo con alarma»: **las dos opciones cumplen** lo que pidió.
   - **Lo que cuesta**: el triángulo pasa a amarillo y necesita el trazo oscuro, que ya resolvió el cuadrado de hoy (`Prioridad.tsx:25-30`).
   - El «No arrancar», que hoy usa el triángulo, deja de usarlo: es un bloqueo de procedimiento (§4.2, de acuerdo con X4 §5.6).
   - **Lo decide Adair** (§7). Si gana la opción de U1 y X1, el resto de esta guía no cambia.
2. **Con U1 §9.2: el diagnóstico en azul.** Propongo **gris**, de acuerdo con X1 §6, punto 1.
   - El azul es el color de la interacción y de la marca.
   - Con deuteranopía, el azul se funde con el morado: 2,3 en oscuro y 3,2 en claro.
   - Una proyección es una alerta de ISA-18.2 (2016), no una alarma [F10]. Cuando cruza el tiempo de respuesta, toma su prioridad.
3. **Con U1 §9.2: el rojo del interlock = el `--p1` de hoy (`#b71c1c`).** Ese rojo queda a 2,9 del naranja en el peor caso de daltonismo.
   - En el tema de hoy propongo `#8b1a1a` (12,8).
   - X1 resuelve lo mismo con otro par (`#a8071a` y un naranja más claro con trazo: 17,5). Cualquiera de los dos sirve; el umbral es el de §6, C7.
4. **Con P1 §1.13: «hasta F3 rige la paleta de hoy».** Propongo que la guía entre **entera, de una vez** (§4.6). Un rojo sin usar no confunde; un rojo que cambia de significado dos veces, sí.
5. **Con la investigación previa** (`~/Downloads/TRIM-hidrocarburos/3-investigacion/12-estandar-hmi-industrial.md`, base de R4 y U1):
   - **«48 % de mejora en detección»** (§A.2 y fuente [7]). La fuente citada, el resumen de ISA de Hollifield y Perez [F5], no trae esa cifra. El estudio ASM con NOVA dice **48 % contra 10 %** de detección antes de la alarma, 96 % contra 70 % de éxito y 10,6 contra 18,1 minutos [F13].
   - **«Rotación de impulsor = bomba corriendo»** (E.3, regla 6; C.2, punto 2). Hollifield pone las bombas que giran como defecto [F5]. Para TRIM: nada se mueve por estar en marcha.
   - **«Menos del 3 % de los píxeles con color»** (A.2): no tiene fuente. Queda como umbral propio de TRIM, medido (§6, C3). La norma que sí da número es NUREG: 10 % de resaltado [F15].
   - **Colores desaturados por serie en las tendencias** (E.1): para TRIM propongo **gris más trazo**, porque el color es del estado (§5.3, punto 7). El color por serie se admitiría solo en un análisis de muchas series, fuera de los niveles 1 a 3.
6. **Con comentarios del código** que le atribuyen a ISA-101 lo que no fija. Por ejemplo, `Prioridad.tsx:53`: «Dato inválido (ISA-101: magenta…)».
   - No se encontró ninguna norma que fije el magenta para el dato inválido; en NUREG el magenta es «estado de alarma» [F15].
   - El comentario debería decir «guía de estilo de TRIM (convención de Adair)». Lo mismo vale para el discurso comercial (§1.8).
7. **Con `08-presentacion` §8.6**: la escala del analógico que se mueve con el valor (B7) y la prioridad que deduce la pantalla (B15). Se corrigen con los pedidos 4 y 5 de §7.
8. **Matiz con X1 §3.3, punto 5** («el oscuro se siente apagado»). La norma no pide más contraste entre los grises del oscuro. Si X1 lo sube, el fondo sigue en gris medio-oscuro (nunca negro, §4.7) y hay que volver a medir los cuatro tonos. El interlock oscuro ya va justo: 3,06:1 sobre `--elevado` (§4.5).

---

## 9. Fuentes

**Normas y organismos (primarias, [P]):**

- **F1** · ANSI/ISA-101.01-2015, *Human Machine Interfaces for Process Automation Systems*: extracto oficial con portada, comité, índice e introducción. Lo publica G. Nasby, miembro votante del ISA101. https://www.grahamnasby.com/files_publications/ANSI-ISA-101-01-2015_TOC-excerpt.pdf
- **F2** · ISA, la serie ISA-101: ISA-101.01-2015, ISA-TR101.01-2022 *HMI Philosophy* e ISA-TR101.02-2019 *HMI Usability and Performance*. https://www.isa.org/standards-and-publications/isa-standards/isa-101-standards
- **F3** · IEC 63303:2024, edición 1.0, *Human machine interfaces for process automation systems*. Vista previa oficial: índice, introducción («derived from ANSI/ISA-101.01-2015») y alcance. https://assets.vde-verlag.de/iec-normen/preview-pdf/info_iec63303%7Bed1.0%7Db.pdf
- **F11** · IEC 62682:2022, edición 2.0, *Management of alarm systems for the process industries*. Ficha: https://webstore.iec.ch/publication/65543
- **F12** · Bullemer, P., Reising, D. V. y Laberge, J., *Why Gray Backgrounds for DCS Operating Displays? The Human Factors Rationale for an ASM Consortium Recommended Practice*, ASM Consortium, 28-feb-2011. Trae la cita completa de la guía de 2008. https://process.honeywell.com/content/dam/process/en/documents/document-lists/doc_asm-consortium/white-papers/February%2028%202011%20-%20Why%20Gray%20Backgrounds%20for%20DCS%20Operating%20Displays.pdf
- **F15** · U.S. NRC, NUREG-0700 rev. 3, *Human-System Interface Design Review Guidelines* (O'Hara y Fleger), julio de 2020: https://www.nrc.gov/docs/ML2016/ML20162A214.pdf (la revisión 4, de enero de 2026, no se revisó: NO VERIFICADO)
- **F18** · W3C, WCAG 2.2, Recomendación del 12-dic-2024. https://www.w3.org/TR/WCAG22/
- **F19** · W3C, *CSS Values and Units*, el píxel de referencia (≈ 0,0213° a un brazo de distancia). https://www.w3.org/TR/css-values-4/
- **F20** · Machado, Oliveira y Fernandes (2009), *A Physiologically-based Model for Simulation of Color Vision Deficiency*, IEEE TVCG 15(6). Las matrices de severidad 1,0, en la página de los autores: https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html
- **F22** · Few, S., *Bullet Graph Design Specification*, Perceptual Edge, revisión del 10-oct-2013. https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf

**Secundarias serias ([S]):**

- **F4** · Wilkins, M. (copresidente del ISA101), «ISA-101.01, Human Machine Interfaces for Process Automation Systems», *InTech*, sept-oct 2020. https://www.isa.org/intech/2020/september-october/isa-101-01-human-machine-interfaces-for-process-au
- **F5** · Hollifield, B. y Perez, H., *High Performance Graphics to Maximize Operator Effectiveness*, versión 2.0, PAS, 2012, publicado por ISA. https://www.isa.org/getmedia/06130a38-f7af-4b35-8c9c-2c34f25c1977/The-High-Performance-HMI-Overview-v2-01.pdf
- **F6** · Hollifield, B., «The high performance HMI: process graphics to maximize operator effectiveness», *InTech* (ISA), reproducido por IDC Online. https://www.idc-online.com/technical_references/pdfs/electronic_engineering/The_high_performance.pdf
- **F7** · Hollifield, B., Oliver, D., Nimmo, I. y Habibi, E., *The High Performance HMI Handbook*, PAS, 2008. **No se leyó** (de pago): lo que aquí se le atribuye sale de F5 y F6, de su primer autor.
- **F8** · Siemens Industry, *Setting a new standard in alarm management: How to follow the ISA 18.2 alarm management standard…*, white paper, enero de 2010. Reproduce la tabla de indicaciones y las métricas de ANSI/ISA-18.2-2009. https://cache.industry.siemens.com/dl/files/836/109772836/att_1002094/v1/WP_Alarm_Management_ISA_18.pdf
- **F9** · Hollifield, B., *Understanding and Applying the ANSI/ISA 18.2 Alarm Management Standard*, PAS, 2010, publicado por ISA. https://www.isa.org/getmedia/55b4210e-6cb2-4de4-89f8-2b5b6b46d954/PAS-Understanding-ISA-18-2.pdf
- **F10** · Stauffer, T. (exida), «New version of ISA 18.2 alarm management standard is released» (19-abr-2016) y «When is an alarm not an alarm?» (18-jul-2019). https://www.exida.com/Blog/new-version-of-isa-18.2-alarm-management-standard-is-released-2016 · https://www.exida.com/Blog/when-is-an-alarm-not-an-alarm
- **F13** · Errington, J., «ASM Outperforms Traditional Interface», *Chemical Processing*, 14-mar-2006: el estudio con NOVA Chemicals. https://www.chemicalprocessing.com/articles/2006/041
- **F14** · La 2.ª edición de la guía ASM (Bullemer y Reising, 2013; de 81 a 64 guías). https://www.fierceelectronics.com/components/asm-consortium-releases-a-2nd-edition-its-hmi-design-guidelines · https://www.controldesign.com/vendors/products/2014/asm-consortiums-second-edition-of-effective-console-operator-hmi-design-practices/ (el libro **no se leyó**)
- **F16** · Brazier, A. (Wilde Analysis), *Control room design – guidance document EEMUA 201 3rd edition updated 2018*, IChemE Hazards 29, 2019; EEMUA 201 **no se leyó** (de pago): https://www.icheme.org/media/19390/hazards-29-paper-10.pdf
- **F17** · Rockwell Automation, *Process HMI Style Guide*, white paper PROCES-WP023 (cita ANSI/ISA-101.01-2015 y ANSI/ISA-18.2-2016). https://literature.rockwellautomation.com/idc/groups/literature/documents/wp/proces-wp023_-en-p.pdf
- **F21** · Ottosson, B. (2020), *A perceptual color space for image processing* (OKLab), el espacio de la separación entre colores. https://bottosson.github.io/posts/oklab/

**Documentos del proyecto:**

- `docs/experiencia-v2/BRIEF.md`, `X1-identidad-referentes.md` y `X4-arquitectura-roles.md`.
- `docs/plan-circular-24/U1-experiencia.md` §9, `U2-choke-experiencia.md`, `P1-producto.md` §1.13, §2.9 y §8.4, e `investigacion/R4-auditoria-producto.md` §5.
- `docs/backend/08-presentacion.md`.
- La reunión del 19-oct-2026 (`docs/reuniones/2026-10-19-edinson-adair/transcript.txt`, [33:45]).
- La investigación previa `12-estandar-hmi-industrial.md` y `18-bombas-multifasicas-inyeccion-isa101.md` (`~/Downloads/TRIM-hidrocarburos/3-investigacion/`).

**Evidencia propia:** `SCR/capturas/` (31 capturas e `informe.json`), `SCR/paletas/` (paletas y medición), `SCR/auditoria-estilo-linea-base.md`, `SCR/scripts/` (`capturas.mjs`, `paleta.mjs`, `buscar.mjs`, `buscar-oscuro.mjs`, `auditar-estilo.mjs`, `marcas.mjs`, `air.mjs`) y `SCR/descargas/` (el texto de las fuentes en PDF). `SCR` = `/private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/ux/X2`.

---

## 10. Resumen

1. **ISA-101 no trae paleta.** Ni ella ni IEC 63303:2024, que deriva de ella: piden una guía de estilo del sitio, escrita y cumplida. TRIM no puede declarar «cumplimiento ISA-101», pero sí seguir su ciclo de vida y adoptar la guía de cada operadora.
2. **Lo de Adair es convención de sitio, no norma.** PlantPAx usa el magenta para la alarma baja, y NUREG, para «estado de alarma». ISA-18.2 sí pide trato propio para el interlock, y NUREG 1.3.8-5 respalda usar los colores que el usuario ya conoce.
3. **TRIM ya cumple lo difícil**: gris; color, forma y número juntos; nada se mueve; entre el 0,02 % y el 0,24 % de la pantalla con color.
4. **Las brechas grandes**: el rojo dice dos cosas; el estado del equipo no se ve por brillo (1,94:1); no hay tendencias en las placas ni en el nivel 1; no hay nivel 1 por rol (Producción mide 3.278 px); un equipo parado lleva 4 marcas; entre el 60 % y el 90 % del texto está bajo 12 px.
5. **Jerarquía.** Técnicos: la planta viva de su campo → el tren → el equipo → el diagnóstico. Gerente: «la planta y el proceso» en 4 o 5 bloques, con Durante, Después y Antes como percepción, comprensión y proyección. Regulatorio: cumplimiento de hoy → árbol → parada → archivo.
6. **Paleta.** Rojo solo para el interlock, con candado (`#8b1a1a`/`#ff8080`); naranja para la alarma 1 (`#bf4000`/`#ffb347`); amarillo con trazo para la 2 y la 3 (`#f9a825`/`#fff176`); morado para «no le crea» (`#8420a3`/`#c99cff`); lo demás, gris. El azul no es un estado. El par rojo-naranja pasa de 2,9 a 12,8 con daltonismo.
7. **Indicadores**: escala fija y número en tinta; tendencias embebidas de hasta 4 trazas; equipos por brillo; nada se anima para decir que algo corre; una sola cifra grande, y medida.
8. **44 comprobaciones para construcción y QA** (§6), con su línea base y un prototipo del auditor.
9. **Por decidir**: con Adair, si la prioridad 2 va en amarillo (esta guía) o en naranja (U1 y X1); con la operadora piloto, su propia guía de estilo.
