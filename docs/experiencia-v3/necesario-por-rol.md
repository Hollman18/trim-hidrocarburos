# Lo necesario de cada rol (§5.1)

**27-oct-2026 · M1.** Es lo primero que se le muestra al dueño (puerta de §10, punto 0).

**El criterio es LO NECESARIO, no lo mínimo.** El dueño lo precisó el 27-oct: *«no es que sea lo mínimo posible, sino que sea lo necesario posible para que agregue tanto valor al problema que nosotros estamos resolviendo»*. Cada rol se armó **desde una hoja en blanco**, con su trabajo real. Solo después se comparó con lo que ve hoy (`roles/<rol>.md`) y se escribió lo que se borra (`borrado.md`).

**Cómo leer este documento**
- **Las dos preguntas de §5.1.** Cada cosa de lo necesario responde que sí a:
  1. ¿Agrega mucho valor al problema del rol: bajar diferidos o perdidos, decidir a tiempo o cumplir?
  2. Sin esto, ¿el rol haría peor su trabajo o perdería algo que no encuentra en otro lado?

  Al lado de cada cosa va su evidencia.
- **Los límites son guía.** Un número manda, el principal. Si hacen falta más de 3 de apoyo, cada uno va con su porqué.
- **Si agrega mucho valor y hoy no existe, se agrega,** marcado **«falta en el motor»**. Nada se inventa: la pantalla dice «sin registro» o «sin dato» hasta que el motor lo calcule.
- **El CUÁNDO manda la pantalla.** Lo que se usa poco pero vale mucho (el reporte del mes, la asignación oficial, el orden de cierre en una alarma) está en lo necesario y **sale solo en su momento**.
- **Datos:** cada número dice de qué función sale (`src/entities` o `src/shared/api`) y su valor en el demo (La Ceiba, 2-oct, 14:00).
- **Fuentes:**
  - `[T mm:ss Persona]`: el transcript del 19-oct (`docs/reuniones/2026-10-19-edinson-adair/transcript.txt`). Hollman habla en un solo bloque, de [04:00] a [22:34];
  - `[X4 §n]`: `docs/experiencia-v2/X4-arquitectura-roles.md`;
  - `[U1 §n]`: `docs/plan-circular-24/U1-experiencia.md`;
  - `[PM §n]`: `docs/plan-circular-24/PLAN-MAESTRO.md`;
  - `[C24]`: la Circular 024 de 2026 de la ANH;
  - `[P-nn]` y `[UI-nn]`: los hallazgos de `docs/experiencia-v2/R-revision/`.

---

## 0. Resumen: los 11 roles en una línea

| Rol | Su trabajo | Número principal (demo) | Acción principal (1 toque) | Cuándo | ¿En el producto? |
|---|---|---|---|---|---|
| **ger** · Gerente de activo | Que el activo dé su meta dejando de producir lo menos | **2.650 bbl/d** se dejan de producir ahora | Abrir el equipo que más pesa | Cada mañana; a fin de mes, firmar metas y compartir el informe | Sí |
| **prod** · Ingeniera de producción | Que el campo dé lo que puede y el mes cuadre | **9.394 de 11.857 bbl/d** salen hoy | Confirmar las paradas del día, en lote | Al empezar el día; a fin de mes, cuadre y asignación | Sí |
| **sup** · Supervisor | Que el turno quede confirmado antes de las 07:00 | **4** paradas por confirmar | Confirmar en lote | Al recibir y al entregar el turno; cuando para una bomba | Sí |
| **oper** · Operador | Decir lo que vio y la señal no sabe | **1 de 4** preguntas | Contestar (la parte, un toque) | Cuando le preguntan; cuando para una bomba o ve una pitera | Sí |
| **jefe** · Jefe de mantenimiento | Intervenir antes de que falle | **1** equipo avisa (K-101) | Ver o crear la orden del que avisa | Cada mañana; en la reunión semanal | Sí |
| **conf** · Confiabilidad | Escoger qué atacar primero | **3.059 bbl/d**: el primero de «Si falla hoy» | Abrir ese equipo | Cada semana; cuando cambia el primero | Sí |
| **plan** · Planeadora | Que el repuesto llegue antes que la falla | Repuestos que no llegan a tiempo (**falta en el motor**) | Pedir el repuesto (**falta en el motor**) | Cada semana | **Sigue apagada** |
| **tec** · Técnico | Hacer el trabajo del día y decir qué encontró | **5** cosas le tocan hoy | Decir qué encontró (la parte, un toque) | Al empezar el día; al cerrar el trabajo | Sí |
| **cont** · Abastecimiento | Saber si una parada fue de un tercero | Paradas de un tercero (**falta en el motor**) | Exportar el expediente | Al cerrar un contrato | **Sale del producto** |
| **reg** · Regulatorio | Que el reporte a la ANH salga completo antes de las 07:00 | **2** paradas sin causa | Exportar el reporte (C024-2026 o DICC-V3.2) | Cada mañana, antes de las 07:00; en la hora de corrección | Sí (obligatorio) |
| **adm** · Administrador | Dejar cada campo configurado y firmado | **3 de 6** pasos listos | Seguir el paso que falta | Mientras se implementa; después, cuando cambia el campo | Sí |

**Contra las hipótesis de §5.2:**
- **sup:** se confirma la hipótesis («paradas por confirmar») y se **refuta X4 §3.4**, que ponía los bbl/d. Él no mueve los bbl/d; lo que solo él hace es confirmar antes de las 07:00 [U1 §1.1; C24]. Los bbl/d quedan de apoyo.
- **jefe:** se confirma la hipótesis («equipos para intervenir ya») y se **refuta X4 §3.4**, que ponía «7,7 de 8,1 días son espera». Esa cifra promedia toda la historia (14 fallas) y casi no se mueve en una semana. Además, Edinson pidió que la cifra de mantenimiento la escoja cada operadora [T 22:34]. Queda de apoyo.
- **ger:** se confirma. Se suman el **cierre proyectado** y la **pérdida**, que Hollman y Edinson pidieron con nombre.
- **conf, prod, oper, tec, reg y adm:** se confirman.
- **plan y cont:** su número principal falta en el motor (§12).

**Lo que se agrega porque agrega mucho valor y hoy no existe** (todo falta en el motor):
- **la pérdida:** ger, prod y reg la ven; el operador la registra. La pidió Edinson [T 26:48];
- **cerrar la orden sin papel:** el técnico. La pidió Edinson [T 22:34];
- **la respuesta de la ANH y la hora de corrección:** reg [C24];
- **convertir el árbol de la operadora:** adm. Es el pedido central de Edinson [T 22:34].

---

## 0b. El choke en cada rol: obligatorio (el dueño, 27-oct)

**El problema es uno:** barriles **diferidos** (lo que se deja de producir y se produce después) y barriles **perdidos** (lo que salió y no se vende).
- **El modelo choke** (SPE-36848, BP 1996; la ANH lo adoptó en las Circulares 003 y 024) **va sí o sí:** es internacional y es la arquitectura con la que se identifica dónde está cada problema.
- **De cada falla** sale su tramo (yacimiento, pozos, planta o salida) y, en el árbol de 6 pasos, si el barril es **diferido o perdido** (paso 3, `dif_perd`). Después vienen si fue planeada y la causa N1 y N2.
- **Ningún rol pierde esta arquitectura.** Lo que cambia es cuánto de ella ve:

| Rol | Cómo está el choke en lo necesario |
|---|---|
| ger | Su número se explica por tramo: la tubería de 4 tramos (o una fila por campo), con **dónde se trabó** (diferido, rayado en su tramo) y la **pérdida en su tramo**, aparte y nunca sumada |
| prod | Su número principal ES el choke: qué tramo limita hoy. Confirma o corrige **el tramo y si es diferida o pérdida** de cada parada |
| sup | Confirma en lote la cadena de cada parada: tramo + diferida o pérdida + planeada + causa |
| oper | Su respuesta llena la causa del árbol. Registrar una pérdida la deja como **PÉRDIDA en su tramo** |
| jefe | Cada equipo que avisa dice en qué tramo frenaría la producción; las fallas del mes, por tramo |
| conf | «Si falla hoy» por tramo; corrige clasificaciones (tramo, diferida o pérdida, planeada) |
| tec | Lo que encontró cierra la causa N1 y N2 de la parada |
| reg | El árbol de 6 pasos completo, como la circular: quién → tramo → diferida o pérdida → planeada → N1 → N2 |
| adm | La topología (a qué pozos sirve cada equipo) es la base del choke; la conversión del árbol de la operadora al de la ANH |

## 0c. La jornada del supervisor (el dueño, 27-oct)

El supervisor necesita ver **en qué jornada (turno y horario) empezó y terminó cada parada**:
- es la base de su entrega de turno;
- y es regulatoria: la Circular 024 pide en `paradas_pozo` la hora de inicio y fin de cada parada (`h_ini_paro` y `h_fin_paro`), con el corte del día a las 23:59:59.

**Lo necesario:**
- en su Hoy, **«Mi turno»**: las paradas que empezaron, siguen o terminaron en su jornada, cada una con su hora de inicio y de fin (o «sigue») y su cadena (tramo, diferida o pérdida);
- arriba, el número de su turno: **paradas por confirmar** y **barriles diferidos en la jornada**;
- **«Entregar turno»** deja de ser un escalón y pasa a lo necesario: el resumen de la jornada, en pantalla y en PDF.

**En el motor:** hoy solo existe «las últimas 12 h» (`TURNO_H`, `hoy.ts`). **Falta** la jornada configurable por campo: el horario de cambio de turno (por ejemplo, 06:00 y 18:00) en `Config`, firmado por el administrador, y la vista de paradas por jornada. Se AGREGA al lado: un campo opcional en la configuración y un filtro `jornada` en `/vistas/hoy`.

## 0d. Las metas y el Antes · Durante · Después: ¿está funcionando TRIM? (el dueño, 27-oct)

El dueño quiere comprobar **qué tan efectivo ha sido el sistema**, y para eso hacen falta **metas** y el **antes, durante y después**. Esto corrige la propuesta A-06 (`borrado.md`): no se borra, se simplifica.

**Lo necesario, simple, en una sola tarjeta** («¿Está funcionando?») para el gerente y producción, y en Resultados:

| Antes | Durante | Después |
|---|---|---|
| **Antes de TRIM** (línea base firmada): bbl/d diferidos no planeados y fallas de equipos críticos al mes | **Ahora, contra la meta**: los mismos dos números, este mes, con su meta firmada al lado | **Lo que ya se ganó**: barriles que se dejaron de diferir desde que entró TRIM, y las fallas que se anticiparon (las que avisó el vigía) |

- Por tramo del choke, a un toque, para ver dónde bajó y dónde no.
- **Datos que ya existen:**
  - la línea base por tramo (`LineaBasePorTramo`, `choke.ts`);
  - «¿Está bajando?» (`plantaViva().bajando`: planta 561 → 308 bbl/d);
  - las metas firmadas (`Config.metas`, `configuracion.ts`);
  - el acierto del vigía (`aciertoVigia`: 3 de 3).
- **Falta en el motor:**
  - la **meta de reducción** contra la línea base (hoy las metas son de producción y de diferido del mes, no de cuánto bajar);
  - la cifra **«barriles que se dejaron de diferir»** (línea base menos lo de ahora, acumulado desde el arranque).
  - Se AGREGA al lado: un campo opcional en las metas y una vista `/vistas/efectividad`.
- **El Antes · Durante · Después del ciclo de la falla** (antes de que falle, mientras está parada, después) queda igual: es el que se ve en el equipo que avisa, el que está parado y el que ya se analizó. **No va como control de 3 posiciones en el inicio** (esa es la decisión 2 de la página de aprobación, A o B).

## 1. ger · Gerente de activo

**Su trabajo, en una frase:** que el activo produzca su meta dejando de producir lo menos posible. No hace el trabajo técnico: manda a actuar y firma la meta. Hollman: «El gerente de planta lo que le interesa es barriles no diferidos… con base a su meta… su pantalla… es ir al grano», y «no un detalle técnico» [T 04:00].

**Su pregunta:** ¿cuánto se deja de producir, por qué equipo, y está bajando? [X4 §2; PM §4]
**Su decisión:** a qué campo y a qué equipo le mete gente y plata hoy, y qué meta firma para el mes.

| | Qué | Las dos preguntas · evidencia | Dato (motor) |
|---|---|---|---|
| **VE** · principal | **bbl/d que se dejan de producir ahora** en sus campos, con el equipo que más pesa en la frase de abajo | (1) Es el dolor que «viene directamente desde la cabeza» [T 04:00 Hollman]. (2) Sin él no sabe dónde mandar a actuar hoy | `plantaViva().cifras.durante` (`entities/planta-viva.ts`; `usePlantaViva`): **2.650** en 5 campos, **1.966** en La Ceiba |
| **VE** · apoyo 1 | **Diferido del mes, en bbl y en USD**, contra el máximo que él firmó | (1) «cuál es el costo de esos barriles diferidos… el diferido diario» [T 04:00 Hollman]. (2) Es la medida contra su meta | `resultados().cifra` (`bbl`, `maximo`) y `plantaViva().esteMes.valorUsd`: **2.376 bbl · 114 mil USD** (máx. 2.300 bbl/d); La Ceiba **1.046 · 50 mil USD** |
| **VE** · apoyo 2 | **Producción por día contra la meta** | (1) «cuál es su promedio de producción diaria… cómo vamos» [T 04:00 Hollman] | `plantaViva().produccion`: **40.514 de 40.200 bbl/d** |
| **VE** · apoyo 3 | **Cierre proyectado** del mes contra la meta | (1) «cuál es el cierre proyectado… si lo vamos a lograr o si no lo vamos a lograr» [T 04:00 Hollman]. (2) Es lo único que le dice a tiempo si el mes se pierde | `resultados().produccion` (proyectado): **1.222.131 de 1.246.200 bbl** |
| **VE** · apoyo 4 | **¿Está bajando?** Lo no planeado por día, antes y con TRIM | (1) Es el norte [PM §1]: «crecimiento de su producción» [T 04:00 Hollman] | `plantaViva().bajando`: planta **561 → 308 bbl/d** (5 campos). La muestra es corta, y se dice |
| **VE** · apoyo 5 | **Pérdida del mes**, aparte y nunca sumada | (1) El norte son los diferidos **y los perdidos** [PM]; Edinson: «no tan solo diferidas, sino pérdidas» [T 26:48]. (2) No la ve en otro lado | **Falta en el motor** (no hay `EventoPerdida`). Hasta entonces dice «sin registro» (`plantaViva().perdida`) |
| **TIENE** | Lo que explica el número: **una fila por campo** (con varios) o la **tubería de 4 tramos** (con uno) | «una visión holística… solo por una planta o por un campo» [T 04:00 Hollman]; los 4 tramos del árbol [T 26:48 Edinson] | `plantaViva().filas` y `.planta` |
| **TIENE** | La ficha ejecutiva del equipo: qué se está haciendo y cuánto le ha costado | «puede ver un poquito más de detalle… que a él le interesa» [T 04:00 Hollman] | `pedirFichaEquipo` / `useFichaEquipo` |
| **TIENE** | A un toque: **el diferido mes a mes y por equipo** (el histórico) | «Si quiere ver el detalle de los diferidos… entender también el histórico» [T 04:00 Hollman] | `plantaViva().mesAMes`, `.porEquipo` |
| **TIENE** | **El informe del mes**, en papel | Lo pasa «a fiscalización al final de la historia» [T 04:00 Hollman] | `emitirInforme`, `pedirCifrasInforme` |
| **HACE** · principal | **Abrir el equipo que más pesa** (1 toque desde la frase) | Su trabajo es mandar a actuar [X4 §2] | Existe: «Ver qué se está haciendo» |
| **HACE** | **Firmar las metas** (`metas:firmar`), como tarjeta cuando toca | «se configura… las metas de diferidos, las metas de lo producido» [T 04:00 Hollman] | `firmarConfiguracion` |
| **HACE** | **Compartir el informe** (`evidencia:exportar`) | Ver arriba | `emitirInforme` |
| **HACE** | **Dar accesos** (`usuarios:administrar`), en el menú de la persona | Seguridad: es obligatoria (§3.4 del encargo), aunque se use poco | `guardarUsuario`, `invitarUsuario` |
| **CUÁNDO** | Cada mañana (mira); cuando un campo se traba (la cifra sube); a fin de mes (firma y comparte) | | |

**Escalera, encima de lo necesario**

| Escalón | Qué suma | Por qué · quién lo pidió | Dato |
|---|---|---|---|
| 1 | **El reporte a la ANH en una línea** («Ayer: enviado, aceptado») | [U1 §1.1] | **Falta en el motor**: el envío y la respuesta |
| 2 | **Lo que todavía se puede mover**, simulado, con los planes en marcha | X4 §4.4 | `plantaViva().mover`, `.planes`. Es simulado: va a un toque, nunca como cifra |
| — | Lo que existe y no entra | «Antes · Durante · Después» como control, «Dónde bajarlo», «Tipo de causa», «Dónde se trabó» en barras, la pantalla Equipos del gerente | `borrado.md` |

---

## 2. prod · Ingeniera de producción

**Su trabajo, en una frase:** que el campo saque lo que puede y explicar el mes en barriles, sin nada sin identificar. Hollman: «Al de producción le interesa literal ver es la producción diaria, pero también le interesan los barriles diferidos… ¿cuáles son los pozos? ¿cuáles son las bombas?» [T 04:00]. `roles.ts` (foco): «Explicas el mes en barriles».

**Su pregunta:** ¿qué limita hoy al campo y dónde rinde más evitar la próxima parada? [X4 §2]
**Su decisión:** confirmar dónde se trabó cada parada (es la clasificación de la ANH) y dónde atacar la restricción.

| | Qué | Las dos preguntas · evidencia | Dato (motor) |
|---|---|---|---|
| **VE** · principal | **bbl/d que salen hoy, contra lo que dan los pozos** (el tramo que limita) | (1) Es el choke del campo: «dice dónde rinde más bajar paradas» [PM §2.2] | `plantaViva().tecnica.cifra` y `.tecnica.tramos` (`cabeBpd` del que `limita`): **9.394 de 11.857 bbl/d** |
| **VE** · apoyo 1 | **Paradas por confirmar** hoy, con la hora límite | (1) Sin ellas, el reporte no sale [C24]; `CONFIRMAN_EN_LOTE = ['sup','prod']` | Existe dentro de `hoy()` (tarea `confirmar`, `accion.ids`): **2**. Como cifra de su inicio hay que publicarla: es un **AGREGADO pequeño**, la misma cuenta `faltan` que `inicioDe` ya hace para el supervisor |
| **VE** · apoyo 2 | **Diferido del mes**, con lo que sigue sin causa | (1) «nada sin identificar» (`roles.ts`); el código de fallo «es importante» [T 04:00 Hollman] | `plantaViva().esteMes`: **1.046 bbl, 355 sin causa** |
| **VE** · apoyo 3 | **El primero de «Si falla hoy»**, en bbl/d | (1) Es la otra mitad de su pregunta [X4 §2] | `plantaViva().tecnica.siFallaHoy[0]`: **3.059 bbl/d** (P-201A y P-201C) |
| **VE** · apoyo 4 | **Pérdida del mes** | (1) Ella explica el mes en barriles, y la pérdida es la otra mitad del norte [T 26:48 Edinson] | **Falta en el motor** |
| **TIENE** | **La tubería del campo, una sola vez**: el dibujo que explica el número | Hollman: «un diagrama de la planta… cuál está en riesgo, cuáles están frenados» [T 04:00]; hoy está 3 veces [P-16] | `pedirTuberia` / `useTuberia` |
| **TIENE** | La cadena de 6 pasos de cada parada, a un toque («Ver una por una») | El árbol de la ANH [T 26:48 Edinson] | `pedirParadasAnh` |
| **TIENE** | A fin de mes: **la medición oficial y el factor** («¿Cuadra?») | Sin el factor en banda, el reporte queda bloqueado (`regulatorio.ts`: `sin-factor`, `fa-fuera-de-banda`) | `useMedicionOficial`, `resultados()` |
| **TIENE** | A fin de mes: **la diferida ANH al lado de la de TRIM**, con su diferencia | «¿Mi diferido es el mismo que va a calcular la ANH?» [U1 §1.1]; [PM §3, «Diferida»] | Parcial: `conciliarAnh` (`entities/anh-paradas.ts`) |
| **HACE** · principal | **Confirmar en lote las paradas del día** (`anh:confirmar`), 1 toque | Obligatorio [C24]; TRIM propone y la persona confirma [PM §3] | `confirmarParadasAnh`, `deshacerAnh` |
| **HACE** | **Corregir dónde se trabó o poner «en el yacimiento»** (`anh:clasificar`, `anh:yacimiento`), en la misma tarjeta | «Una señal apunta, no prueba» [T 37:34 Hollman] | `clasificarParada`, `declararYacimientoAnh` |
| **HACE** | **Cargar la asignación oficial** (`asignacion:cargar`); sale como tarjeta solo cuando vence | Sin ella, «lo que asigna TRIM no se coteja con lo que reportó la operadora» (texto de Hoy) | `cargarAsignacion` |
| **CUÁNDO** | Al empezar el día (confirmar antes de las 07:00); cuando algo se traba; a fin de mes (cuadre y asignación) | | |

**Escalera, encima de lo necesario**

| Escalón | Qué suma | Por qué · quién lo pidió | Dato |
|---|---|---|---|
| 1 | **Qué limitó, día por día**, y la eficiencia de producción (la escalera de lo que no se produjo) | [CHOKE-COMPLETO §15] | `pedirSerieChoke`, `pedirRepartoChoke` |
| 2 | **El tren de agua** como nivel 2: cuánto aguanta el tanque y el orden de cierre | Edinson: la bomba de agua se daña «y se empiezan a rebosar los niveles» [T 31:08]; Adair: el piloto es una bomba de inyección [T 33:45] | `pedirTuberiaAgua` |
| 3 | **Los pozos** en tabla: frecuencia, corte de agua, diferido por pozo | «¿Cuáles son los pozos?» [T 04:00 Hollman] | `pedirPozos`, `pedirFlotaEsp` |
| — | No entra | La Planta viva del gerente como su inicio, la segunda y la tercera tubería, «Lo que todavía se puede mover» en la primera capa, «Diferido por día, mes a mes» en el inicio | `borrado.md` |

---

## 3. sup · Supervisor de operaciones

**Su trabajo, en una frase:** que su turno quede confirmado para el reporte antes de las 07:00 y que, si para una bomba de agua, se cierre en el orden que menos cuesta. `roles.ts` (foco): «Si una para, cierras en el orden que menos cuesta».

**Su pregunta:** ¿qué paró en mi turno y qué me falta confirmar antes de entregar? [X4 §2; U1 §1.1]
**Su decisión:** confirmar o corregir lo que TRIM dedujo, y quién contesta lo que nadie ha contestado.

| | Qué | Las dos preguntas · evidencia | Dato (motor) |
|---|---|---|---|
| **VE** · principal | **Paradas por confirmar**, con la hora límite | (1) Sin esto el reporte no sale [C24: antes de las 07:00]. (2) No lo encuentra en otro lado | `hoy()` → `inicioDe` (rama `sup`, la cuenta `faltan`): **4**. Hoy viaja solo dentro de la frase `inicio.explica`; publicarla como número es un **AGREGADO pequeño** |
| **VE** · apoyo 1 | **bbl/d que se dejan de producir ahora** en su campo | (1) Dice si hay que actuar ya | `hoy().inicio.cifra` (rama `sup`): **1.966** |
| **VE** · apoyo 2 | **Equipos que no se pueden arrancar** hasta identificar | (1) Seguridad y no conformidad (texto de la franja) | `hoy().bloqueos[].equipos`: **2** (P-201B y LC-21) |
| **VE** · apoyo 3 | **Paradas sin causa** que nadie ha contestado | (1) Sin causa no se publica [C24] | `hoy()`, tarea `conseguir-causa`: **2** (LC-21 y LC-08) |
| **TIENE** | **El orden de cierre**, solo cuando para una bomba de agua | (1) Es barril evitable: «evitable cerrando en orden», 30 bbl en octubre. Sale solo en la alarma, que es su momento | `pedirTuberiaAgua`: «cierre primero LC-02, LC-10 y LC-01: 3.059 bbl/d después de 2 min» |
| **TIENE** | La cadena de cada parada, a un toque («Ver una por una») | [U1 §2] | `pedirParadasAnh` |
| **HACE** · principal | **Confirmar en lote** (`anh:confirmar`), 1 toque, con Deshacer | Obligatorio [C24]; hoy ya es 1 toque | `confirmarParadasAnh`, `deshacerAnh` |
| **HACE** | **Responder él** la causa que nadie contestó (`causa:declarar`) | Hoy lo hacía el escalamiento por WhatsApp, que sale. Lo reemplaza esta tarjeta con su insignia (§6) | `responderParada`, `responderPreguntaAnh` |
| **CUÁNDO** | Al recibir el turno; antes de entregarlo; cuando para una bomba de agua (el orden de cierre) | | |

**Escalera, encima de lo necesario**

| Escalón | Qué suma | Por qué · quién lo pidió | Dato |
|---|---|---|---|
| 1 | **«Entregar turno»**: el mismo Hoy como resumen en pantalla y en PDF, sin chat | X4 §3.6, punto 3, y P-06; §6 del encargo (el reemplazo sin WhatsApp) | `hoy().entrega`, sin su parte de WhatsApp |
| 2 | **Crear el aviso en SAP** desde la parada (`sap:aviso`) | Hollman lo puso en el roadmap: «no está en la primera etapa» [T 04:00]; SAP es F4 [PM §5] | `enviarAviso` |
| 3 | **Decidir los planes** del ciclo (`planes:decidir`) | X4 §3.3 | `decidirPlan`. Son simulados |
| — | No entra | «Diferido de su turno (12 h)», «≈ 983 bbl en el turno que entra · proyectado», la pantalla Turno (repite Hoy), «Su campo, ahora», el turno en WhatsApp | `borrado.md` |

---

## 4. oper · Operador de campo

**Su trabajo, en una frase:** decir lo que vio cuando la señal no lo dice, de a una pregunta, y no arrancar lo que no se ha identificado. Hollman: «el equipo… debe registrarlo dentro de la misma aplicación» [T 04:00].

**Su pregunta:** ¿qué me falta contestar ahora? [X4 §2; PM §4]
**Su decisión:** qué parte se dañó o por qué paró el pozo, y si puede arrancar.

| | Qué | Las dos preguntas · evidencia | Dato (motor) |
|---|---|---|---|
| **VE** · principal | **Preguntas por contestar** («1 de 4»), con la primera abierta | (1) Sin su respuesta no hay código de fallo [T 04:00 Hollman] ni reporte [C24] | `hoy().inicio.cifra` (rama `oper`): **1 de 4** |
| **VE** · apoyo 1 | **Equipos que no se pueden arrancar** | (1) Seguridad y no conformidad | `hoy().bloqueos`: **2** |
| **TIENE** | **El orden de cierre**, solo cuando para una bomba de agua | Es barril evitable; él cierra las válvulas | `pedirTuberiaAgua` |
| **TIENE** | La ficha del equipo (nivel 3), a un toque desde la pregunta | Adair: que se sienta como su SCADA de alto desempeño [T 33:45] | `pedirNivelEquipo` (`shared/api/equiposTecnico.ts`) |
| **HACE** · principal | **Contestar**: 1 toque para la parte o la causa; lo que vio va como pregunta siguiente, opcional | Hoy son 2 toques (medido en la app: «Sello mecánico» → «Fuga hacia afuera»). La imagen aprobada lo hace en 1 [P-07] | `responderParada`, `responderPreguntaAnh`. **Ojo:** hoy el libro escribe la parte al contestar el modo (`OpcionHoy`, `hoy.ts`). Pasar a 1 toque es un cambio del motor y va con su prueba |
| **HACE** | **Registrar una pérdida** (pitera, derrame, tea) con botones | (1) Él es quien la ve; la pérdida es la mitad del norte. Edinson: «si hay una pitera… eso es una pérdida» [T 31:08]; [PM §5, F2: «captura de pérdidas en el teléfono»]. (2) Si no la registra, nadie la mide | **Falta en el motor** |
| **CUÁNDO** | Cuando le llega una pregunta; cuando para una bomba de agua; cuando ve una pérdida | | |

**Sin menú.** Necesita una sola pantalla: Hoy. La Planta viva y Equipos dejan de ser puertas suyas (§9.4 del encargo).

**Escalera, encima de lo necesario**

| Escalón | Qué suma | Por qué · quién lo pidió | Dato |
|---|---|---|---|
| 1 | **La planta del campo** (nivel 1), como contexto | X4 §3.2: rotan y se enseñan entre ellos | `pedirPlantaViva` |
| 2 | **Sus equipos** en lista | X4 §3.2 | `pedirListaEquipos` |
| — | No entra | La pantalla Turno, «Su campo, ahora», «Lo más frágil» como aviso fijo, el turno en WhatsApp | `borrado.md` |

---

## 5. jefe · Jefe de mantenimiento

**Su trabajo, en una frase:** intervenir antes de que el equipo falle y acortar lo que dura una falla. `roles.ts` (foco): «Antes: intervenir a tiempo».

**Su pregunta:** ¿qué hay que intervenir ya, y estoy anticipando las fallas o corriendo detrás de ellas? [X4 §2; PM §4]
**Su decisión:** a qué equipo manda la cuadrilla hoy, y a cuál no (porque hoy vale más).

| | Qué | Las dos preguntas · evidencia | Dato (motor) |
|---|---|---|---|
| **VE** · principal | **Equipos que avisan**: intervenir antes de que fallen, con el más cercano | (1) Es el centro del producto: «anticiparnos a su daño… para que ellos puedan tomar acción inmediata» [T 04:00 Hollman] | `listaEquipos().cuentas.estado.avisan` (`entities/equipos-tecnico.ts`): **1** (K-101, «ya pasó el límite») |
| **VE** · apoyo 1 | **Paradas por identificar** | (1) Sin la parte no hay análisis: «es importante el código de fallo» [T 04:00 Hollman] | `hoy()`, tarea `conseguir-causa`: **3** (P-201B, LC-21 y LC-08) |
| **VE** · apoyo 2 | **Fallas de los equipos críticos este mes** | (1) Es el primer indicador del norte: «paradas no planificadas por equipo crítico al mes ↓» [PM §1] | Base en el motor: `historialDeEquipo().eventos` (`entities/libro.ts`, vía `pedirConfiabilidad`): **1** en octubre (P-201B, 2-oct). **La cuenta por mes la hace hoy la pantalla** (`pages/Confiabilidad.tsx`, «Fallas por mes»): hay que pasarla al motor (**AGREGADO**) |
| **VE** · apoyo 3 | **De cada falla, los días que son espera** | (1) Es la palanca del tiempo fuera [PM §1]. Edinson pidió que la cifra la escoja la operadora [T 22:34] | `pedirRelojes` (`shared/api/sap.ts`; `relojes()`): **7,7 de 8,1 días** |
| **TIENE** | **«No intervenir hoy»**, solo cuando aplica | Evita una parada que hoy vale más | `listaEquipos().noIntervenir`: «P-201A y P-201C valen más mientras P-201B esté parada» |
| **TIENE** | La orden abierta del equipo (SAP) y su ficha (nivel 3) | Hollman: quitar «ese reproceso administrativo» [T 04:00] | `pedirOrdenesSap`, `pedirNivelEquipo` |
| **TIENE** | **El tiempo fuera en sus 5 tramos**: detección, administrativo, logística, reparación y arranque | (1) [PM §1]: dice dónde se va el tiempo. (2) La espera sola no dice si es el repuesto o el permiso | **Falta en el motor** en parte: `relojes()` da total, activa y espera |
| **HACE** · principal | **Ver o crear la orden del equipo que avisa** (`sap:aviso`), 1 toque desde la tarjeta | Hollman [T 04:00] | `enviarAviso`, `pedirOrdenesSap` |
| **HACE** | **Completar el análisis de la falla** (`causa:completar`) | El modo de falla alimenta al vigía [PM §2.1] | `completarAnalisis` |
| **CUÁNDO** | Cada mañana (qué intervenir); en la reunión semanal (las fallas y la espera) | | |

**Escalera, encima de lo necesario**

| Escalón | Qué suma | Por qué · quién lo pidió | Dato |
|---|---|---|---|
| 1 | **Cumplimiento del programa del técnico** | Edinson [T 22:34] | **Falta en el motor** |
| 2 | **Decidir los planes** (`planes:decidir`) | X4 §3.3 | `decidirPlan` (simulados) |
| 3 | **Mantenimiento proactivo** (%) | [U1 §1.1] | `resultados()`: «14 % mantenimiento proactivo» |
| — | No entra | La pantalla Mantenimiento como está (9 paneles), «Dónde bajarlo», «Horas en SAP», «Diferidos» y «Confiabilidad» como pantallas propias | `borrado.md` |

---

## 6. conf · Ingeniero de confiabilidad

**Su trabajo, en una frase:** escoger qué equipo y qué modo de falla atacar primero, y dónde va el próximo instrumento. Hollman: «en confiabilidad… cuáles son esos equipos específicos… las variables» [T 04:00]. Edinson, el experto, pidió las métricas modulares [T 22:34].

**Su pregunta:** ¿qué equipo ataco primero, y cuánto le creo al número? [X4 §2]
**Su decisión:** el equipo, el modo y el instrumento.

| | Qué | Las dos preguntas · evidencia | Dato (motor) |
|---|---|---|---|
| **VE** · principal | **bbl/d que se dejan de producir si falla hoy el primero**, con el equipo y si TRIM lo vigila | (1) «si ese equipo se llega a dañar… 1665 barriles diferidos por día» [T 04:00 Hollman]; la criticidad dinámica [PM §5, F2] | `listaEquipos().primero.valor`: **3.059 bbl/d** (P-201A y P-201C, sin instrumento) |
| **VE** · apoyo 1 | **¿Le creo al vigía?** Los aciertos de lo que se puede juzgar | (1) «cuánto le creo al número» [X4 §2]; el acierto se mide, no se supone [PM §5] | `aciertoVigia()`: **3 de 3** |
| **VE** · apoyo 2 | **Equipos sin instrumento** | (1) Su decisión es dónde va el próximo | `listaEquipos().cuentas.estado['sin-instrumento']`: **5** |
| **VE** · apoyo 3 | **Tiempo entre fallas** de la familia del primero | (1) Edinson: MTBF o MTTR, según el área [T 22:34] | `pedirConfiabilidad`: bombas de agua **41 d** |
| **VE** · apoyo 4 | **Clasificaciones confirmadas por una persona** | (1) «Clasificar mal planeada o no planeada» es el riesgo del indicador del norte [PM §7]. (2) Nadie más lo vigila | `calidadClasificacion()` (`entities/anh-calidad.ts`): **0 de 7 filas** |
| **TIENE** | La ficha del equipo (nivel 3) y el diagnóstico (nivel 4): salud por parte y vigía | «monitoreando cada una de esas variables» [T 04:00 Hollman]; Adair: «9 temperaturas, 2, 3 vibraciones…» [T 36:51] | `pedirNivelEquipo` |
| **TIENE** | Los más costosos y de qué fallan | Edinson [T 22:34] | `pedirConfiabilidad` |
| **HACE** · principal | **Abrir el primero** (1 toque) | X4 §3.4 | Existe |
| **HACE** | **Completar el análisis de la falla** (`causa:completar`) | El modo de falla (ISO 14224) es su materia prima | `completarAnalisis` |
| **HACE** | **Corregir una clasificación** (`anh:clasificar`, `anh:yacimiento`) | Edinson: adoptar el árbol de la operadora al de la ANH [T 22:34] | `clasificarParada` |
| **CUÁNDO** | Cada semana; cuando cambia el primero de la lista | | |

**Lo que no existe y no se inventa:** «aquí va el próximo instrumento» no tiene escritura en TRIM. Hoy se decide afuera.

**Escalera, encima de lo necesario**

| Escalón | Qué suma | Por qué · quién lo pidió | Dato |
|---|---|---|---|
| 1 | **La cifra que escoja la operadora** (MTBF, tiempo fuera, reparación o logística), con banda de confianza | Edinson [T 22:34]; [U1 §7] | **Falta en el motor**: los paquetes de métricas |
| 2 | **La historia del PLC** de cada parada | [X4 §3.7] | `pedirHistoriaEquipo` |
| — | No entra | Los 12 filtros, «Qué está en riesgo» debajo de la lista (repite la cabeza), la tabla entera de «Si falla hoy» en el inicio, la Planta viva del gerente, Planta y Agua como puertas suyas | `borrado.md` |

---

## 7. plan · Planeadora de mantenimiento (hoy apagada)

**Su trabajo, en una frase:** que cada trabajo de la semana tenga su repuesto y su gente antes de que llegue la falla. Edinson: «esa pérdida de tiempo en la distribución de órdenes físicas… esa área de planeación para cerrar todas las órdenes» [T 22:34].

**Su pregunta:** ¿qué programo esta semana y qué repuesto pido ya? [X4 §2]

| | Qué | Dato (motor) |
|---|---|---|
| **VE** · principal | **Repuestos que no llegan antes de la falla anunciada** («¿alcanza?» [PM §2.3]) | **Falta en el motor.** Existen las piezas: `repuestosDe()` (`entities/sap.ts`: `stock`, `minimo`, `plazoDias`) y la anticipación del vigía (`aciertos.ts`). El cruce no existe |
| **VE** · apoyo | **Trabajos programados de la semana**; **repuestos críticos bajo su mínimo** | Parcial: el programa de paradas (`hoy()` → `programa`); repuestos por equipo (`nivelEquipo().repuestos`). Por campo, **falta en el motor** |
| **HACE** | **Pedir el repuesto**; **mover un trabajo** | **Falta en el motor** (no hay escritura) |

**Recomendación: sigue apagada, no se borra.**
- **Por qué no sale:** su dolor lo nombró el experto de la reunión [T 22:34 Edinson] y es parte del «actuar rápido» del norte [PM §2.3].
- **Por qué no se enciende:** su número y sus acciones **faltan en el motor**. Encenderla hoy sería mostrar una pantalla que no responde su pregunta.
- **Cuándo se enciende:** con el programa del técnico y «¿alcanza?» (F3–F4 [PM §5]).
- **Lo que se arregla ya:** `#/plan/…` abre la vista de producción sin avisar [P-17]. Tiene que decir que el rol no está disponible.

---

## 8. tec · Técnico de mantenimiento

**Su trabajo, en una frase:** hacer el trabajo del día y decir qué encontró, sin papel. Hollman: «a él no necesitamos mostrarle más, sino… regístrame qué fue lo que encontraste, cómo lo encontraste, qué se reparó» [T 04:00]. Edinson: las órdenes en papel «las llenan de grasa o de mugre o de agua… no es muy trazable» [T 22:34].

**Su pregunta:** ¿qué me toca hoy y qué me falta cerrar? [X4 §2; PM §4]
**Su decisión:** qué hace primero y qué encontró.

| | Qué | Las dos preguntas · evidencia | Dato (motor) |
|---|---|---|---|
| **VE** · principal | **Cosas que le tocan hoy**, con la primera | (1) Es su día | `hoy().inicio.cifra` / `useInsigniaDeHoy`: **5** |
| **VE** · apoyo 1 | **Equipos que no se pueden arrancar** | (1) Seguridad | `hoy().bloqueos`: **2** |
| **TIENE** | Su orden de SAP con lo que hay que hacer | «qué se reparó» [T 04:00 Hollman] | `pedirOrdenesSap` (las que tienen `tecnico` igual a él) |
| **TIENE** | La ficha del equipo (nivel 3), con su historia y los repuestos | | `pedirNivelEquipo` (`repuestos`, `historia`) |
| **HACE** · principal | **Decir qué encontró**: 1 toque para la parte; lo que vio, como pregunta siguiente | Hoy son **3 toques** («Contestar» → la parte → lo que vio) [P-07] | `responderParada`, con la misma condición del motor que el operador |
| **HACE** | **Cerrar la orden en el teléfono**, sin papel: qué se reparó, lecturas y horas | (1) Es el pedido de Edinson [T 22:34] y el tramo «reparación» del tiempo fuera [PM §2.3]. (2) Sin esto la orden sigue en papel | **Falta en el motor**: no hay escritura para cerrar una orden |
| **CUÁNDO** | Al empezar el día; al terminar cada trabajo | | |

**Sin menú.** Necesita una sola pantalla: Hoy.

**Escalera, encima de lo necesario**

| Escalón | Qué suma | Por qué · quién lo pidió | Dato |
|---|---|---|---|
| 1 | **Rutas predictivas** (vibración, termografía) en su día | Edinson: «una campaña de vibraciones o termografía… integrados en el día a día» [T 22:34] | **Falta en el motor** |
| 2 | **Trabajar sin señal** | [U1 §1.1] | **Falta**: es del front y de la sincronización |
| — | No entra | «Su campo, ahora», la Planta viva y Equipos como puertas, el párrafo de K-101 | `borrado.md` |

---

## 9. cont · Abastecimiento y contratos (hoy apagado)

**Su trabajo, en una frase:** saber si una parada le toca al contratista, a un tercero o a la operadora, con prueba. `roles.ts` (foco): «La línea de tiempo viene del PLC».

| | Qué | Dato (motor) |
|---|---|---|
| **VE** · principal | **Paradas del período con responsable externo** | **Falta en el motor** como vista. El dato base existe: el paso 1 «Quién» de cada `ParadaAnh` (`paradasAnh()`; responsables `tercero`, `externo-*`, `comunidad`…) |
| **TIENE** | El expediente de la parada con la hora del PLC | `useParadasDeBombas`. Hoy `pages/Evidencia.tsx` **suma las horas y los barriles en la pantalla**, contra la regla «el motor calcula» |
| **HACE** | Exportar el expediente (`evidencia:exportar`) | `descargarCsv`, en la pantalla |

**Las dos preguntas:**
- (1) **No agrega mucho valor al norte.** No baja un barril diferido ni uno perdido, y el responsable ya queda en el paso 1 del árbol de la ANH, que confirman sup y prod [C24].
- (2) **Sin esto, nadie pierde algo que no encuentre en otro lado.** El paso 1 está en la cadena de cada parada, y el informe con folio lo exportan ger, prod y reg. Nadie lo pidió en la reunión ni lo dijo el dueño: lo puso la arquitectura (U1 §1.1) para F3.

**Recomendación: sale del producto.**
- **Qué se borra del front:** el rol y la pantalla Evidencia (`pages/Evidencia.tsx`), con sus pruebas.
- **Qué no se toca (§3.1):** la vista de paradas de bombas la usan otras pantallas. En el contrato, lo que solo use cont va como «no prioritario», no como RETIRADO.
- **Si vuelve:** como una vista «por responsable» en Resultados de ger o de reg, si una operadora con mantenimiento tercerizado la pide. El dato ya está en el árbol.

---

## 10. reg · Cumplimiento regulatorio

**Su trabajo, en una frase:** que el reporte de paradas a la ANH salga completo antes de las 07:00, y corregirlo dentro de 1 hora si lo rechazan. Es obligatorio (Circular 024) y no se borra.

**Su pregunta:** ¿el reporte pasa? Si no, ¿qué falta, quién lo debe y cuánto tiempo queda? [X4 §2]
**Su decisión:** publicar o esperar, y a quién apurar.

| | Qué | Las dos preguntas · evidencia | Dato (motor) |
|---|---|---|---|
| **VE** · principal | **Paradas sin causa**: lo que impide publicar | (1) Una fila mala tumba el IDP de la operadora [PM §7] | `reporteAnh().cifra.valor` (`entities/regulatorio.ts`; `useReporteAnh`): **2** |
| **VE** · apoyo 1 | **bbl sin causa** | (1) Es lo que no se puede reportar | `reporteAnh().bblSinCausa`: **355** |
| **VE** · apoyo 2 | **La hora límite** | (1) C24: antes de las 07:00 | `reporteAnh().paradas[].cuando` y `.limite`: «mañana antes de las 07:00» |
| **VE** · apoyo 3 | **La respuesta de la ANH** y lo que queda de la hora para corregir | (1) La circular da 1 h para corregir [C24; PM §8]. (2) Sin esto no sabe si cumplió | **Falta en el motor** |
| **TIENE** | **Quién debe cada parada**, una fila por parada | X4 §3.4: «qué falta, quién lo debe» | `reporteAnh().paradas[].debe` |
| **TIENE** | **El árbol de 6 pasos, como la circular** | Edinson [T 26:48]; [C24] | `pedirParadasAnh`, `pedirCalidadAnh` |
| **TIENE** | **Las pérdidas del período**, para el balance | La pérdida «podrá estar sujeta a gravamen» [C24 p.4]; Edinson [T 26:48] | **Falta en el motor**. Hoy el árbol dice «TRIM todavía no tiene registro de pérdidas», y está bien que lo diga |
| **TIENE** | A un toque: **la medición oficial y las calibraciones** | Se usa poco, pero se revisa al cierre del mes | `useMedicionOficial` |
| **HACE** · principal | **Exportar el reporte** en C024-2026 o DICC-V3.2 (`evidencia:exportar`), 1 toque | Obligatorio [C24] | Existe en la pantalla Regulatorio |
| **CUÁNDO** | Cada mañana, antes de las 07:00; en la hora de corrección; al cierre del mes | | |

**No necesita «pedir la causa».** Cuando falta una causa, la pregunta ya le sale en el Hoy de quien la debe, con su insignia (la tarjeta «Contestar» de `hoy()`). Una escritura para que regulatorio «pida» sería un segundo canal para lo mismo. Además, `revisarParadaAnh` exige `anh:clasificar`, que este rol no tiene.

**Escalera, encima de lo necesario**

| Escalón | Qué suma | Por qué · quién lo pidió | Dato |
|---|---|---|---|
| 1 | **El historial de envíos** y sus descargas | [U1 §6.4] | **Falta en el motor** |
| 2 | **PRODML** | [X4 §3.6]: queda para el papel | Existe |
| — | No entra | La Planta viva y Resultados como puertas suyas, el segundo «Exportar» | `borrado.md` |

---

## 11. adm · Administrador de la implementación

**Su trabajo, en una frase:** dejar cada campo configurado y firmado: perfil, tanques, a qué pozos sirve cada equipo, capacidades, factor y tags. Edinson: «cargar la filosofía operacional, que es lo que cuesta… es fácil de adecuar» [T 22:34].

**Su pregunta:** ¿está completo cada campo, y qué falta para firmar? [X4 §2]
**Su decisión:** qué paso completa y cuándo firma la versión.

| | Qué | Las dos preguntas · evidencia | Dato (motor) |
|---|---|---|---|
| **VE** · principal | **Pasos listos del campo** («3 de 6»), con el siguiente | (1) Sin configuración no hay choke ni libro | `estadoConfiguracion()` (`entities/choke-config.ts`): **3 de 6**; el siguiente, `topologia` |
| **VE** · apoyo 1 | **Equipos por confirmar** (a qué pozos sirve cada uno) | (1) Es el paso que falta | `estadoConfiguracion().pasos` (topología): **36** |
| **VE** · apoyo 2 | **Tags sin equipo** | (1) Un tag sin equipo no se mide | `useRegistro` / `sugerir` (`shared/api/registro.ts`): **3**, con sugerencia |
| **TIENE** | Sus otros campos, con su «N de M» | | `estadoConfiguracion()` por campo |
| **TIENE** | **La conversión del árbol de la operadora** al de la ANH | (1) Es el pedido central de Edinson: «cómo adoptan su árbol de fallas… al árbol… de la ANH» [T 22:34]. Da la línea base desde el primer día [PM §2.2] | **Falta en el motor**: hoy solo existe la procedencia `conversion` (`anh-clasificacion.ts`) |
| **HACE** · principal | **Seguir el paso que falta** (1 toque) | X4 §3.4 | Existe |
| **HACE** | **Firmar la versión** (`config:firmar`) | Todo rige solo con firma y motivo (trazabilidad, D1) | `firmarConfiguracion` |
| **HACE** | **Asociar tags** (`conector:configurar`), con «Aplicar las 3» | | `asociarTag` |
| **CUÁNDO** | Cada día mientras se implementa; después, cuando cambia el campo (un equipo o un tag nuevo) | | |

**Ojo:** con todo firmado, el rol casi no se usa. Su inicio dice «Todo firmado» y nada más.

**Escalera, encima de lo necesario**

| Escalón | Qué suma | Por qué · quién lo pidió | Dato |
|---|---|---|---|
| 1 | **El perfil de métricas** de la operadora | Edinson [T 22:34]; [U1 §7.1] | **Falta en el motor** |
| 2 | **Los bordes** (firmware, enlace, buffer) | | `useRegistro` |
| — | No entra | La Planta viva, Planta y Agua como puertas suyas; WhatsApp Business en Conectores (§6, otro agente) | `borrado.md` |

---

## 12. plan y cont: la recomendación

| Rol | Recomendación | Por qué |
|---|---|---|
| **plan** | **Sigue apagada**, con lo necesario ya escrito | Su dolor tiene dueño (Edinson [T 22:34]) y mueve el norte. Pero su número y sus acciones faltan en el motor. Se enciende con el programa del técnico y «¿alcanza?» (F3–F4). Mientras tanto, `#/plan/…` tiene que decir «no disponible» [P-17] |
| **cont** | **Sale del producto** | No mueve un barril y su dato ya vive en el paso 1 del árbol. Nadie lo pidió. Si una operadora lo pide, vuelve como vista «por responsable» de ger o de reg |

---

## 13. Hoy contra lo necesario

**Cómo se midió:**
- **Hoy:**
  - las palabras y las cifras salen de `docs/experiencia-v2/R-revision/medicion/despues.json` (ed559e4, 27-oct): el inicio de cada rol a 390 px (sin desplazarse y la página entera) y la suma de sus puertas a 1440 px;
  - los botones se contaron en la app a 390 × 844 (`npx vite --port 5181`, 27-oct). La vista incluye los de la cabecera.
- **Lo necesario:**
  - las palabras se contaron sobre el boceto de §14, sin la cabecera común;
  - las cifras incluyen las que hoy dicen «sin registro».
- **Los toques:** los de la tarea principal, hoy (`R-revision/roles/<rol>.md` y la app) contra lo necesario.

| Rol | Pantallas: hoy → necesario | Cifras del inicio (página, 390): hoy → necesario | Palabras del inicio (vista / página, 390): hoy → necesario | Palabras de todas sus puertas hoy (1440) | Botones del inicio (vista / página, 390): hoy → acciones necesarias | Toques de la tarea principal: hoy → necesario |
|---|---|---|---|---|---|---|
| ger | 3 → 2 | 50 → 6 | 85 / 280 → 42 | 968 | 13 / 27 → 4 | 1 → 1 |
| prod | 11 → 2 | 55 → 5 | 82 / 307 → 41 | 4.555 | 13 / 31 → 3 | 2 → 1 |
| sup | 8 → 1 | 18 → 4 | 104 / 172 → 29 | 2.923 | 12 / 17 → 2 | 1 → 1 |
| oper | 7 → 1 | 11 → 2 | 93 / 110 → 25 | 2.027 | 10 / 11 → 2 | 2 → 1 |
| jefe | 10 → 2 | 16 → 4 | 89 / 133 → 36 | 4.534 | 12 / 15 → 2 | 1 → 1 |
| conf | 11 → 2 | 108 → 5 | 88 / 1.111 → 34 | 5.164 | 14 / 59 → 3 | 1 → 1 |
| plan | cae en prod → apagada | — | — | — | — | — |
| tec | 6 → 1 | 11 → 2 | 88 / 174 → 25 | 1.739 | 12 / 18 → 2 | 3 → 1 |
| cont | cae en prod → sale | — | — | — | — | — |
| reg | 3 → 1 | 12 → 4 | 81 / 84 → 34 | 802 | 16 / 17 → 1 | 1 → 1 |
| adm | 5 → 2 | 8 → 3 | 79 / 89 → 31 | 1.671 | 18 / 21 → 3 | 1 → 1 |

**Lo que dice la tabla:**
- **Los toques ya estaban cerca:** la revisión anterior los bajó. Lo que sobra es **lo que se ve**: hasta 1.111 palabras y 108 cifras en el inicio de confiabilidad.
- **Las palabras del inicio bajan de −50 % (prod y ger) a −73 % (oper)** contra la vista de hoy a 390 px. Contra la página entera del inicio, de −60 % (reg) a −97 % (conf).
- **Las pantallas medidas pasan de 64 a 17.** Lo que sale de la primera capa sigue a un toque, en papel o en su escalón.
- **Lo necesario agrega 6 cosas que hoy no existen** (todas faltan en el motor): la pérdida, registrarla, cerrar la orden, la respuesta de la ANH, los 5 tramos del tiempo fuera y la conversión del árbol.

---

## 14. Boceto en texto de lo necesario (390 px)

Solo el contenido, para contar palabras y para las imágenes de §7. La cabecera común (campo, hora de los datos y marca de condición) no entra en la cuenta. «Sin registro» es lo que dice la pantalla mientras el motor no lo calcule.

**ger** (5 campos)
> Ahora · **2.650** bbl/d se dejan de producir
> Casi todo: P-201B, La Ceiba.
> Este mes **2.376** bbl · 114 mil USD · máx. 2.300
> Producción **40.514** / 40.200 bbl/d
> Cierre proyectado **1.222.131** / 1.246.200 bbl
> No planeado **561 → 308** bbl/d
> Pérdida: sin registro
> [ Ver P-201B ]  Informe · Metas

**prod**
> Salen hoy **9.394** / 11.857 bbl/d
> Limitan los pozos. Planta: sobran 1.143.
> Por confirmar **2** · antes de las 07:00
> Este mes **1.046** bbl · 355 sin causa
> Si falla hoy **3.059** bbl/d · P-201A
> Pérdida: sin registro
> [ Confirmar las 2 ]  Ver una por una

**sup**
> Por confirmar **4** · antes de las 07:00
> Ahora **1.966** bbl/d se dejan de producir
> No arrancar **2** · P-201B, LC-21
> Sin causa **2** · LC-21, LC-08
> [ Confirmar las 2 ]  Responder yo

**oper**
> Pregunta **1 de 4** · P-201B paró 03:52
> ¿Qué se dañó?
> [ Sello mecánico ] [ Rodamientos ] [ Otra parte ] [ No sé ]
> No arrancar **2** · P-201B, LC-21
> [ Registrar una pérdida ]

**jefe**
> Avisan **1** · K-101 ya pasó el límite
> [ Ver la orden ]
> Por identificar **3** · P-201B, LC-21, LC-08
> Fallas de equipos críticos · octubre **1**
> Espera **7,7 de 8,1** días por falla
> Ojo: hoy no intervenga P-201A ni P-201C.

**conf**
> Si falla hoy **3.059** bbl/d
> P-201A y P-201C · sin instrumento
> Vigía **3 de 3** aciertos
> Sin instrumento **5** equipos
> Entre fallas **41** d · bombas de agua
> Clasificación confirmada **0 de 7** filas
> [ Abrir P-201A ]

**tec**
> Hoy **5** cosas · primero P-201B
> ¿Qué se dañó en P-201B?
> [ Sello mecánico ] [ Rodamientos ] [ Otra parte ] [ No sé ]
> No arrancar **2** · P-201B, LC-21
> [ Cerrar la orden ]

**reg**
> Sin causa **2** paradas · no se puede publicar
> **355** bbl · límite mañana 07:00
> LC-21 · 247 bbl · lo debe el operador
> LC-08 · 108 bbl · lo debe el operador
> ANH: sin respuesta registrada
> [ Exportar el reporte ]

**adm**
> La Ceiba **3 de 6** pasos listos
> Falta: a qué pozos sirve cada equipo.
> Por confirmar **36** equipos
> Tags sin equipo **3** · con sugerencia
> [ Seguir el paso ]  Firmar · Aplicar las 3

**Verificado contra el motor (27-oct):** los conteos del demo de esta página se leyeron con `listaEquipos`, `estadoConfiguracion`, `criticidadDelCampo` y `pedirConfiabilidad`. Por ejemplo: avisan 1, sin instrumento 5, parados 4, el primero 3.058,6 bbl/d (P-201A y P-201C), 3 de 6 pasos listos y 1 falla de equipo crítico en octubre (P-201B).
