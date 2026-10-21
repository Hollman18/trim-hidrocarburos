# U1 · Experiencia de usuario: árbol ANH, choke, pérdidas, conversión, métricas modulares, programa del técnico y colores

> **Nota del 21-oct-2026 (v2 del plan):** el norte de TRIM es bajar las paradas no planificadas de los equipos críticos; el cumplimiento ANH es valor agregado. Las fases y prioridades de este documento quedan reemplazadas por `PLAN-MAESTRO.md` §5. El modelo, las reglas y el diseño siguen vigentes.


Diseñador de experiencia (UX) del plan. Fecha: 21-oct-2026. Sigue `docs/plan-circular-24/CONTEXTO.md`. No se tocó código.

> Estado: COMPLETO, con la ronda de corrección de `S1-revision.md` §7.2 aplicada (U1-1 a U1-12). Vocabulario alineado con `P1-producto.md` §1–§4.1, «Cambios al vocabulario» y «Respuestas a UX» (relectura del 21-oct-2026). Las citas del transcript van por su marca [mm:ss].

## 0. Resumen

1. **Valor por rol (§1).** Cada rol responde una sola pregunta.
   - El gerente ve de qué campo viene el diferido, dónde se trabó (en 4 palabras) y qué equipos lo generan, con la pérdida aparte. No ve N1/N2, partes ni métricas técnicas.
   - Al operador nunca se le pide el choke, ni la N1, ni el volumen.
2. **Clasificación (§2).** La unidad de la pantalla es una **cadena de 6 eslabones ya propuesta por TRIM**, leída en el orden de la circular, con la procedencia de cada eslabón.
   - Deducida: 1 toque (o 2 para un lote).
   - Declarada: 2–3 toques.
   - Sin identificar: 3–5 toques.
   - Las preguntas van en palabras de campo. Nunca se muestran las 117 causas.
   - «¿Planeada?» filtra la N1, así que la incoherencia que la ANH rechaza no se puede construir.
3. **Choke (§3).** Dos rótulos para dos cosas: «Qué limita hoy al campo» (calculado) y «Dónde se trabó» (el de cada parada).
4. **Pérdida (§4).** Captura en el teléfono con foto y un rango de volumen. Prod cierra el número y el método. Nunca se suma al diferido.
5. **Conversión del árbol propio (§5).** Asistente de 5 pasos para árboles de 4 o de miles de hojas: herencia por nodo, sugerencias con su porqué, «hay que preguntar», impacto simulado y firma de reg.
6. **Cierre del día (§6).** La pantalla «Cumplimiento regulatorio» gira alrededor del reloj de las 07:00 y de la hora de corrección.
7. **Métricas (§7).** Tarjetas modulares con la cifra principal que escoge la operadora y bandas de confianza en palabras.
8. **Técnico (§8).** Programa del día y cierre de la orden en el teléfono, sin señal.
9. **Colores (§9).** Paleta de Adair: rojo solo para el interlock (candado), naranja y amarillo para las alarmas, morado para sin comunicación.
10. **Bocetos y pruebas (§10, §11).** Bocetos de 6 pantallas y las pruebas con operadores, Edinson y Adair.

## §1 Valor por rol

### 1.0 Principios que valen para todos los roles

Salen de la investigación previa y de la ronda 1. Cada uno lleva su fuente.

1. **El rol es una lente, no un permiso** (`13-ux-flujos-interaccion.md` §2.1). Una misma persona puede tener varios roles. La lente cambia qué ve primero y qué se esconde. Lo que puede escribir lo deciden las capacidades de `src/entities/roles.ts`.
2. **TRIM propone y la persona confirma.** La circular pide que clasifiquen «los ingenieros y operadores del campo» (C24 p.5). Una propuesta deducida y confirmada por una persona cumple eso. Un relleno automático sin confirmación es discutible (R4 §3.2; R1 A-13/A-14, NO VERIFICADO cómo lo audita la ANH). En pantalla, por eso, nunca se muestra una clasificación ANH «lista» sin decir quién la confirmó.
3. **Dos vistas del mismo barril.** La de gestión (equipo, parte, `TipoCausa`) y la regulatoria (los 6 pasos ANH) salen del mismo tramo de parada y nunca de dos capturas distintas (R2 §6.4 regla 2). Las dos suman igual. La pantalla lo demuestra con la misma cifra arriba de las dos vistas.
4. **Una pérdida nunca se suma al diferido.** Va en una línea aparte, con su propia unidad (bbl de crudo o KPC de gas) (R3 G1; C24 p.4).
5. **Nada se rellena para que cuadre.** Lo que falta se ve como pendiente, con su contador y su hora límite (las 07:00), y no con un comodín (R2 §6.4 regla 3; `13-ux` §3.4).
6. **Lo normal va en gris.** El color solo marca lo anormal y siempre va con forma y texto (`12-estandar-hmi-industrial.md` A.2; `src/shared/ui/Prioridad.tsx`).
7. **Palabras de campo.** Se dice «cerró», «paró», «se regó», «la tea», «la pitera», «el pórtico», «la red de media». No se dice «downtime», «asset» ni «choke_mod» (`15-ux-industria` D, error 18). Los códigos ANH (`NP_SUB`) solo los ve quien los necesita: regulatorio, administración y confiabilidad, a un toque.

### 1.1 Tabla de valor por rol

Roles: ids reales de `src/entities/roles.ts`. Hoy `plan`, `cont` y `reg` están apagados en el MVP (`src/shared/config/producto.ts:14`). Según P1 («Respuestas a UX», P-1), `reg` y la pantalla Regulatorio se encienden en F1, antes del 1-dic. `plan` llega en F4, con el programa del técnico. `cont` llega en F3.

Columnas: **Decide** = la decisión que el árbol, el choke, las pérdidas y las métricas le ayudan a tomar · **Ve** = lo que aparece por defecto · **No ve** = lo que su lente esconde (sigue a un toque si su cuenta lo permite, salvo donde se dice «nunca») · **Pregunta** = la pregunta que la pantalla le contesta en una frase.

| Rol | Decide | Ve (por defecto) | No ve | Pregunta que le responde |
|---|---|---|---|---|
| **ger** · Gerente de activo | Dónde poner plata y gente; qué campo o equipo atacar primero; si la pérdida es asunto del operador o de un tercero (la pérdida «podrá estar sujeta a gravamen… de acuerdo con la responsabilidad de la compañía operadora», C24 p.4; que eso se traduzca en regalías es inferencia de R2 §4.1, NO VERIFICADO) | **Por campo**: diferido del período y su reparto en 4 barras (pozo · planta · exportación · reservorio), y **qué equipos lo generan** (nombre corto y familia: «P-201B · bomba de reinyección»), como hoy en `PorCampo.tsx`. **Pérdida** en línea aparte: bbl y KPC del período, por tipo (derrame, tea…) y por quién la causó (operador / tercero / naturaleza). Planeado vs no planeado en un solo número. Estado del reporte ANH en una línea: «Ayer: enviado 06:12, aceptado». G1, G2, G3, C2 de R3 y una frase de tendencia | **Nunca**: N1/N2, códigos ANH, partes, modos ISO, MTBF, MTTR, Weibull, tags, señales (regla del dueño, CONTEXTO.md). El choke solo como «dónde se trabó» con las 4 palabras, sin la teoría | «¿De qué campo viene lo que no produjimos, qué equipos lo causan y qué se perdió de lo ya producido?» |
| **prod** · Ingeniera de producción | Si el diferido del mes cuadra; qué pozos cerrar primero ante una restricción; qué prueba de pozo vale; si una restricción es de pozo, de planta o del yacimiento | El **choke del campo** (cuál de los cuatro limita hoy y con qué potencial), la diferida ANH (literal, sin factor) al lado de la de TRIM (con factor) y su diferencia (R1 R-5; R4 D2), la prueba «reportada a la ANH» frente a la vigente (R4 D1), el reparto por choke y por N1, las paradas parciales (frecuencia bajada) y las de reservorio | Detalle de mantenimiento (órdenes, horas, repuestos), MTBF por equipo | «¿Mi diferido es el mismo que va a calcular la ANH, y si no, por qué?» |
| **sup** · Supervisor de operaciones | Confirmar en lote las paradas del turno antes del cierre; en qué orden cerrar pozos si la planta se traba; escalar lo que nadie respondió | **Turno**: las paradas del día con su estado ANH (completa · falta confirmar · falta un dato), cuántas faltan para el cierre de las 23:59 y cuántas horas quedan hasta las 07:00. La cadena propuesta de cada parada en una línea. El choke del campo hoy («Hoy limita: planta · agua») | N1/N2 con código; métricas de confiabilidad; dinero | «¿Qué paradas de mi turno siguen sin clasificar y quién me falta?» |
| **oper** · Operador de campo | Qué pasó en el equipo que vio (lo que la señal no sabe) | Una pregunta por vez, en el teléfono o en WhatsApp: «¿qué encontró?», «¿fue programado?», «¿se regó crudo?» con 2 a 4 botones grandes | **Nunca** se le pide: choke, N1, N2, volumen, responsable externo con nombre técnico (`13-ux` D.5: «Nunca pedir al operador… elegir un choke»). No ve el árbol | «¿Qué me falta contestar ahora?» |
| **jefe** · Jefe de mantenimiento | Si el mantenimiento pasa de correr a anticipar; qué parte del tiempo fuera es reparación y qué es espera; si el programa preventivo convierte no planeado en planeado | Reparto planeado / no planeado **con la definición ANH** (incluye pruebas, workover, curtailment, puesta en servicio; R4 brecha 4); las paradas con responsable «Operador-Mantenimiento»; T1 proactivo; los 5 tramos del tiempo fuera (R3 L1-L5); cumplimiento del programa del técnico (T3, T4, P4); las paradas que se pasaron de su ventana programada (el exceso es tramo no planeado, R2 §1.2c) | Diferida literal ANH y prueba reportada (es de producción); JSON | «¿Cuánto del diferido es mío, cuánto era evitable y dónde se me va el tiempo de reparación?» |
| **conf** · Ingeniero de confiabilidad | Qué modo atacar, qué instrumentar, qué estrategia; si la clasificación ANH que propone TRIM es correcta por familia | La **cifra principal** que escogió su operadora (MTBF, MDT, MART o logística) por familia, con banda de confianza; bad actors; Pareto por parte y modo; P-F y margen logístico (L6); y la **calidad de la clasificación ANH**: % confirmado, % corregido por las personas, reglas de deducción que más se corrigen | Dinero de detalle; JSON | «¿Qué equipo me cuesta más barriles y por qué falla, y cuánto le puedo creer al número?» |
| **plan** · Planeadora de mantenimiento | Qué entra a la semana, con qué repuesto y qué técnico; qué ruta de vibración o termografía programar y cada cuánto | **Programa de la semana** por frente y técnico; avance del día en vivo (cerradas en el teléfono, pendientes, sin conexión); backlog (T5); rutas que vencen; L6/L7 («¿alcanza el repuesto?»); paradas programadas con su N1 ANH ya asignada | bbl del gerente (sí ve G3 por equipo); JSON | «¿Qué programo la semana que viene y qué repuesto pido ya?» |
| **tec** · Técnico de mantenimiento | Qué hacer hoy y registrar qué encontró | **Su día**: órdenes y rutas a su nombre, en orden; cada una con lo que el vigía avisa; cerrar con fotos, lecturas y horas; funciona sin señal | Indicadores de la flota; **ningún ranking de técnicos** (R3 §4.2); el árbol ANH (su cierre lo alimenta sin que lo vea) | «¿Qué me toca hoy y qué me falta cerrar?» |
| **cont** · Abastecimiento y contratos | Quién responde por una parada o una pérdida ante el contratista o el tercero | Paradas y pérdidas con responsable `Tercero`, `Externo-*` u `Operador-Mantenimiento` (si el mantenimiento es tercerizado), con su línea de tiempo del PLC y su evidencia; el «tiempo de logística» (L3) por contratista | N1/N2 de detalle; métricas de confiabilidad | «¿Esta parada o esta pérdida le toca al contratista, a un tercero o a nosotros, y con qué prueba?» |
| **reg** · Cumplimiento regulatorio | Si el IDP sale a las 07:00; qué corregir si la ANH rechaza; si la tabla de conversión sirve para firmar | **Cierre del día** (§6): paradas del día anterior con su clasificación completa o no, validación propia, envío, respuesta de la ANH, ventana de 1 h, historial y descargas. Los códigos y cadenas exactas que salen en el JSON. Las pérdidas que van al balance | Métricas de confiabilidad, órdenes | «¿Mi reporte de hoy pasa, y si no, qué me falta y cuánto tiempo tengo?» |
| **adm** · Administrador | Cómo se configura el campo: árbol propio, tabla de conversión, choke por equipo, registro ANH de cada pozo, operadora y contrato, paquetes de métricas | **Configuración** (§5): carga del árbol propio, mapa a la ANH con sugerencias, hojas sin mapear o ambiguas, impacto antes de publicar, versiones firmadas; choke de cada equipo (dedicado o compartido) | Cifras de diferido de detalle; dinero | «¿Está completo y coherente lo que configuro, y qué cambia si lo publico?» |

### 1.2 Qué cambia en cada pantalla actual (resumen)

| Pantalla actual | Rol | Cambio de experiencia (sin tocar código, solo descrito) |
|---|---|---|
| Resumen (`Resumen.tsx`, `widgets/resumen/PorCampo.tsx`, `ResumenDirectivo.tsx`) | ger | «POR CAMPO» suma una barra de 4 tramos de choke y la línea de pérdida aparte. «POR EQUIPO» queda igual (ya cumple la regla del dueño). Una línea de estado del IDP |
| Diferidos (`Diferidos.tsx`, `widgets/diferidos/Paretos.tsx`) | ger, prod, jefe, conf | Un selector de vista: «Por equipo» (hoy) · «Por choke» · «Como la ANH (N1)» · «Por responsable». La cifra total no cambia entre vistas. Cuadre «diferida TRIM ↔ diferida ANH» para prod |
| Identificar (`Causa.tsx`) | prod, sup, oper, jefe, conf, tec | Es la que más cambia (§2): tarjeta con la cadena propuesta de los 6 pasos y un solo botón de confirmar; preguntas solo donde la señal no alcanza |
| Turno (`Turno.tsx`) | sup, oper | Bloque «Cierre de hoy para la ANH»: cuántas paradas del día están completas, confirmar en lote |
| Mantenimiento (`Mantenimiento.tsx`) | jefe | «Programado y no programado» pasa a la definición ANH; se agrega el programa del técnico y los 5 tramos del tiempo fuera |
| Confiabilidad (`Confiabilidad.tsx`) | jefe, conf, plan | Tarjetas modulares con la cifra principal configurada y banda de confianza (§7) |
| Mi trabajo (`Trabajo.tsx`) | tec | Pasa de «órdenes de SAP en solo lectura» a su programa del día con cierre en el teléfono (§8) |
| Configuración (`Configuracion.tsx`) | adm, ger | Nuevas secciones: árbol propio y conversión (§5), choke por equipo, registro ANH de pozos, perfil de métricas (§7.1) |
| Regulatorio (`Regulatorio.tsx`) | reg | Deja las 6 casillas PRODML y pasa a «Cumplimiento regulatorio» (§6) |
| Superficie (`Equipo.tsx`) | jefe, conf, plan | Cada equipo muestra su choke («Planta · compartido por 12 pozos») |

## §2 Flujo de clasificación de una parada (los 6 pasos ANH)

> **Vocabulario (alineado con `P1-producto.md` §1, leído el 21-oct a las 07:24).** La parada reportable es una `ParadaAnh` con su `ClasificacionAnh`. Cada paso es un `DatoClasificado` con su `Procedencia`. Los estados son los de `EstadoParadaAnh`, y en pantalla se dicen así:
> - `propuesta` → **«falta confirmar»**
> - `por-precisar` → **«falta un dato»**
> - `confirmada` → **«completa»**
> - `pendiente` → **«sin causa»**
>
> Los valores en pantalla son las etiquetas de P1 §1.2:
> - Responsable: «Operador · Mantenimiento», etc.
> - Choke: «Pozo», «Planta», «Exportación (evacuación)», «Reservorio».
> - Impacto: «Diferida», «Pérdida».
> - Planeación: «Planeada», «No planeada».
> - N1 y N2: el N1_TEXT y el N2 de la Tabla 1 en tipo oración.
>
> Las marcas de procedencia se dicen así en pantalla (mapeo propio de UX sobre `Procedencia`):
> - `senal` y `regla` → «TRIM lo dedujo: {porqué}»
> - `conversion` → «su árbol: {hoja}»
> - `programa` → «programa firmado»
> - `declarado` → «dijo {persona} · {hora}»
> - `confirmado` → «confirmó {persona} · {hora}»
> - `corregido` → «corrigió {persona} · {hora}» (con «antes: …» al lado)

### 2.1 La idea: una cadena propuesta, no un formulario

La circular pide 6 pasos en orden: Responsable → Choke → Diferida/Pérdida → ¿Planeada? → N1 → N2 (C24 p.5). Para la mayoría de las paradas, TRIM ya sabe 4 o más de los 6 desde las señales (R4 §1.7; R2 §3.3). Por eso la unidad de la pantalla no es un formulario de 6 campos. Es una **cadena de 6 eslabones ya llena**, leída en el orden de la circular, donde cada eslabón dice de dónde salió:

```
LC-14 · cerró 02:10 · 3,2 h · 41 bbl                          falta confirmar
 1 Quién            Operador · Mantenimiento        TRIM lo dedujo: la falla es de la propia bomba
 2 Dónde se trabó   Pozo                            TRIM lo dedujo: el equipo es solo de este pozo
 3 Qué pasó         Diferida                        el pozo cerró; nada se regó
 4 ¿Planeada?       No planeada                     no estaba en el programa firmado
 5 Causa            No planeada - Mecánica subsuelo TRIM lo dedujo: de la parte que falló
 6 Detalle          Falla ESP                       código GF del variador · 02:10
                                   [ Confirmar ]   [ Corregir un paso ]
```

Cada eslabón lleva una marca de procedencia, siempre escrita y nunca solo como ícono (ver arriba el mapeo de `Procedencia`). Si el eslabón todavía no tiene dato, la marca es **«falta»**: el eslabón se pinta como hueco gris, con contorno discontinuo y la palabra «falta». **No usa el morado**: no es un dato malo, es una respuesta que falta, y el morado queda solo para `sin-comunicacion` y `dato-invalido` (S1 U1-3; P1-7 a). Si se acerca la hora límite (05:00), lleva la marca de aviso (cuadrado amarillo con «3»). Los 6 rótulos de la izquierda («Quién», «Dónde se trabó», «Qué pasó», «¿Planeada?», «Causa», «Detalle») son el nombre de cada paso que propone UX. Al lado, en el ⓘ, va el nombre de la circular («Paso 1: identificación del responsable», etc.).

La cadena se lee en el orden de la circular, así que quien confirma recorre los 6 pasos en orden. **Pero las preguntas se le hacen al operador en el orden de campo** («¿qué encontró?» primero), porque es lo que sabe. **NO VERIFICADO**: que la ANH acepte una captura en otro orden si la confirmación final recorre los 6 pasos en orden. La circular habla de clasificar «de forma secuencial» (C24 p.5) y no dice nada de la interfaz. Va como pregunta para Edinson (§11).

### 2.2 Los tres casos y cuántos toques cuestan

Meta: **1 toque y menos de 15 s en el caso frecuente** (estado del arte: Guidewheel, TeepTrak, MAJiK; `09b` §6). La persona solo responde lo que la señal no alcanza (`causa-senal.ts`, regla 5).

| Caso | Qué sabe TRIM | Quién toca | Toques | Qué se le pregunta |
|---|---|---|---|---|
| **A · Deducida por señal** (código del variador, primera alarma de la bomba, servicio caído, programa firmado) | Los 6 eslabones | Supervisor o producción (individual); el operador no la confirma, porque no contestó nada (confirmación por paso, §2.4) | **1**: «Confirmar» | Nada |
| A en lote (fin de turno) | Igual, agrupadas por cadena idéntica | Supervisor | **2 para N paradas**: abrir el grupo, «Confirmar las 9» | Nada; ve el grupo con su evidencia |
| A en cascada (cayó SE-2 y cerraron 20 pozos) | Una sola cadena para los 20 | Supervisor | **1** | Nada. Son 20 filas en el JSON, pero una sola decisión (Unicidad, C24 p.5; R1 A-15) |
| **B · Declarada con catálogo** (bomba de la línea o ESP: falta la parte) | 5 de 6: falta el detalle (N2), que sale de la parte | Operador o técnico | **2–3**: parte · qué vio (como hoy, `Causa.tsx`) · «Confirmar» | «¿Qué encontró?» y «¿Qué vio?». La pregunta de pérdida solo si el equipo puede regar (§2.5) |
| B · Pozo sin catálogo (bombeo mecánico, flujo natural, «no fue la ESP») | Quién y dónde, a veces | Operador | **2–3**: qué lo paró · el detalle · «Confirmar» | §2.4, preguntas en palabras de campo |
| **C · Sin identificar** (ninguna regla aplica) | Solo la hora y el pozo | Operador; si no contesta, supervisor | **3–5**: qué lo paró · el detalle · ¿programado? · ¿se perdió algo? · «Confirmar» | Las 4 preguntas de §2.4; cada una se salta si la anterior ya la resolvió |
| Conversión con destino `precisar` (la hoja del árbol propio cubre varias parejas ANH; `DestinoConversion` de P1 §1.10, R2 §5.4 punto 3) | Todo menos la pareja exacta | Quien responde | **+1** | Una pregunta más, con solo las opciones que esa hoja admite |

Responsables que una señal nunca deduce (`Comunidad`, `Autoridad/Regulador`, `Tercero`, `Fuerza Mayor (Clima/Natural)`, R2 §3.3): la señal propone «Externo, sin detalle» y el eslabón 1 queda en «falta». Una persona lo cierra.

### 2.3 Cómo no abrumar con 117 causas

- **Nunca se muestra la lista de 117.** Las preguntas van en dos niveles cortos y en palabras de campo (§2.4). Se usa la regla de `09b` §2: 5 o 6 grupos visibles y de 3 a 5 hijos, nunca más de 15 por nivel, y sin «Otro» por defecto.
- **El N2 siempre sale filtrado por su N1.** La lista más larga es la de `NP_ENINT`, con 13 (R1 §1.5). Y casi nunca se muestra entera: TRIM la propone desde la parte y el modo (p. ej., «Variador» → «Falla VSD»).
- **Corregir un paso (para prod, conf, jefe y sup)** abre un selector de dos columnas. A la izquierda, las N1 permitidas por la respuesta de «¿Programado?» (8 o 12), con su nombre de campo. A la derecha, las N2 de esa N1. Arriba hay un buscador: «Buscar: transformador» devuelve las parejas que lo contienen, con su N1 al lado. Así «Falla por falta de Mantenimiento» aparece dos veces, cada una con su N1 (`NP_ENINT` y `NP_INS`), y nunca se confunden (R1 §1.5, duplicado). Primero salen «las más usadas en este campo».
- **Desempate en solapamientos.** Si la búsqueda trae dos parejas parecidas («Hurto» y «Hurto de instrumentación»), la más específica sobre el equipo afectado sale primero, con una línea que explica la diferencia (R2 §5.4, errores típicos).
- **«Orden público - Pendiente detalle»** se muestra solo dentro de orden público, con la nota «úsela solo si todavía no se sabe qué pasó». Si su uso pasa de un umbral, confiabilidad recibe un aviso (R1 R-12; R2 §5.4).
- **Huecos ANH** (bomba de varilla, aire de instrumentos, declinación: sin N2 propio, R2 §3.3): la propuesta usa la pareja «menos mala» que firme la operadora en su tabla de conversión, con la marca «sin causa exacta en la ANH». **NO VERIFICADO** qué espera la ANH; es pregunta para Edinson.

### 2.4 Las preguntas y los botones, con el texto exacto

Regla de escritura: verbo de campo, sin códigos, sin la palabra «choke», una pregunta por pantalla, de 2 a 6 botones, y un botón honesto «No sé». «No sé» es válido y escala al supervisor (`13-ux` §4.1 paso 4: forzar certeza fabrica datos falsos).

Las preguntas se llaman «Pregunta 1» a «Pregunta 4» para no confundirse con P1 (el documento de producto), con P-1…P-16 (los pedidos) ni con la prioridad 1 (cambio opcional 1 de `S1-revision.md` §7.3).

**Pregunta 1 · ¿Qué lo paró?** (solo en los casos B sin catálogo y C)

| Botón (texto exacto) | Lo que deja propuesto |
|---|---|
| Se dañó un equipo | Operador · Mantenimiento; luego la pregunta de la parte |
| Se fue la energía | Luego «¿De dónde vino el corte?» |
| Lluvia, rayo, creciente o derrumbe | Fuerza mayor (clima/natural); luego «¿Qué se afectó?» (abajo). La N1 no se fija todavía |
| Bloqueo, paro, robo o amenaza | Comunidad o Tercero; luego «¿Qué se afectó?». La N1 no se fija todavía |
| La planta no recibe (agua o proceso) | Operador · Operación · Planta · `NP_PROC` (el agua de disposición es siempre Planta, P1 §3.4) |
| El tanque de crudo está lleno | Luego «¿El oleoducto o el cliente estaba recibiendo?» (abajo) |
| El oleoducto o el cliente no recibe | Externo · Transportador · Exportación (evacuación) · `NP_TRANSP` |
| Una autoridad lo ordenó | Autoridad / Regulador · `NP_AUT` |
| Era un trabajo o una prueba programada | Planeada; luego «¿Qué trabajo era?» (solo claves `P_*`) |
| No sé | Queda en «falta»; escala al supervisor |

En el teléfono se ven 5 botones y «Más opciones…». Los 5 visibles son los más usados en ese campo, con un orden fijo por campo para que la memoria de uso no se rompa.

**Seguimiento del tanque de crudo · ¿El oleoducto o el cliente estaba recibiendo?** Es la regla de P1 §2.1 (fila `evacuacion`) y §3.3: el choke es el del componente donde se origina la restricción.

| Botón | Propone |
|---|---|
| Sí, recibía | Operador · Operación · Planta · `NP_PROC` «Tanques llenos / capacidad limitada» |
| No, no recibía | Externo · Transportador · Exportación (evacuación) · `NP_TRANSP`; luego el detalle (oleoducto fuera, nominación, terminal) |
| No sé | «falta» en Quién y Dónde; escala al supervisor |

**Seguimiento de clima y orden público · ¿Qué se afectó?** Se pregunta antes de fijar la N1, porque una tormenta o un robo pueden caer en tres N1 distintas (R1 §1.5, solapamientos).

| Botón | Propone |
|---|---|
| El pozo, la locación o la vía | `NP_CLIMA` o `NP_OPUB`, según la respuesta anterior; luego el detalle |
| Un instrumento | `NP_INS` («Daño por tormenta eléctrica», «Daño por humedad / inundación», «Hurto de instrumentación», «Instrumentación manipulada por terceros») |
| El oleoducto | `NP_TRANSP` («Atentado/sabotaje oleoducto externo»), Exportación (evacuación) |
| No sé | «falta» en Causa y Detalle |

**Seguimiento de energía · ¿De dónde vino el corte?** Es el ejemplo del transformador de Edinson (Transcript [26:48]).

| Botón | Propone |
|---|---|
| De afuera: la red del proveedor | Externo · Proveedor de energía · Planta · `NP_ENEXT` |
| Del campo: pórtico, red de media o subestación | Operador · Mantenimiento · **Planta** · `NP_ENINT` |
| De este pozo: su transformador, su variador o su cable | Operador · Mantenimiento · **Pozo** · `NP_ENINT` |
| No sé | «falta» en Quién y Dónde |

**Seguimiento de trabajo programado · ¿Qué trabajo era?** Las 8 `P_*`, en palabras de campo:
- Mantenimiento eléctrico
- Mantenimiento mecánico
- Instrumentos
- Líneas y válvulas
- Workover o intervención
- Prueba de pozo
- Arranque o puesta en servicio
- Se restringió por decisión de operación

**Pregunta 3 · ¿Este cierre estaba programado?** Solo cuando no lo dice el programa firmado y la respuesta anterior no lo resolvió.
- «Sí, estaba en el programa»
- «No, fue de repente»
- «No sé»

**Pregunta 4 · ¿Se perdió crudo o gas que ya había salido?** Solo si el equipo puede regar o mandar a la tea (§2.5).
- «No, solo dejó de producir»
- «Sí, se regó crudo»
- «Sí, se fue gas a la tea o se venteó»
- «No sé»

(La Pregunta 2 es la de la parte y lo que se vio, que ya existe en `Causa.tsx`.)

**Quién confirma qué: confirmación por paso.** Así quedó en P1 §1.3 tras la revisión (cambio P1-6 de `S1-revision.md`). La marca de persona tiene que significar que una persona competente miró ese paso; de lo contrario se fabrica un origen `M` (S1 §2.2 d).
- **Operador y técnico (oper, tec).** Su toque sube a `confirmado` **solo lo que es de su terreno**: qué encontró, si estaba programado y si se regó algo.
- **Lo técnico** (Dónde se trabó, Causa, Detalle) sigue como propuesta de TRIM (origen `C`) hasta que lo confirma un rol de la segunda fila de `PASOS_QUE_CONFIRMA` (sup, prod, jefe o conf; P1 §1.3). La confirmación **en lote** (`anh:confirmar`) sigue siendo solo de sup y prod.
- **Supervisor, producción, jefe de mantenimiento y confiabilidad (sup, prod, jefe, conf).** Su toque confirma los 6 pasos: jefe y conf porque son quienes abren o analizan el equipo (P1, cambio P1-6 «hecho distinto»).

**Botones de la cadena:**
- **Para sup y prod**: «Confirmar» (principal). Debajo, en pequeño: «Queda confirmado por {nombre} · {hora}».
- **Para oper y tec**: «Confirmar lo que contesté» (principal). Debajo: «El resto lo revisa su supervisor».
- «Corregir un paso» (secundario). Abre la cadena con cada eslabón tocable, según la capacidad de quien la abre.
- Al confirmar: «Listo. LC-14 queda completa para el reporte de mañana. Deshacer» (5 s). Para oper y tec: «Listo. Su respuesta queda guardada; el supervisor revisa el resto».
- En lote: «Confirmar las 9» y «Ver una por una». Solo para sup y prod.
- Sin permiso: «Su rol no confirma paradas: lo hace operación o mantenimiento» (texto que ya existe en `Causa.tsx`).

### 2.5 Cómo se impide la incoherencia planeada / N1

La ANH rechaza el archivo si la planeación no coincide con el prefijo de N1 (C24 p.7). En TRIM, esa incoherencia **no se puede construir**:
1. **El paso 4 filtra el paso 5.** Con «Planeada» solo se ofrecen las 8 `P_*`; con «No planeada», solo las 12 `NP_*`. No hay forma de escoger otra. Coincide con P1 §1.4: el tipo `ClasificacionAnh` no deja construir la combinación cruzada, y mientras falta un paso el objeto es un `BorradorClasificacion`.
2. **Si se cambia el paso 4 después**, los pasos 5 y 6 se vacían y quedan en «falta», con este aviso: «Cambió a "No planeada": la causa que tenía era de las planeadas. Escoja la causa otra vez». Nunca se convierten solos.
3. **El exceso de una parada programada** (se pasó de su ventana) se parte en dos tramos. La propuesta muestra dos cadenas: «02:00–06:00 · Planeada · Planeada - Mantenimiento Mecánico» y «06:00–09:30 · **se pasó de la ventana** · No planeada · falta la causa» (R2 §1.2c, NO VERIFICADO con la ANH).
4. **Validación antes del reporte** (§6): la misma regla corre sobre todas las paradas del día. Si algo llegara incoherente (p. ej. desde una tabla de conversión vieja), sale como error que bloquea el envío, con un enlace a la parada.
5. **Pérdida y diferida a la vez.** La Pregunta 4 sale solo para los equipos que pueden regar o quemar: línea de flujo, tanque, tratador, compresor (por la tea) y separador. En una ESP no se pregunta. Si la respuesta es «Sí, se regó crudo», la parada sigue como **Diferida** (el pozo cerró) y se crea **aparte** un evento de pérdida ligado a ella (§4). Es la propuesta de R2 §4.4, NO VERIFICADO con la ANH (es la pregunta n.º 1 de R2 §9). La cadena muestra los dos: «Diferida · y además una pérdida: 12 bbl regados (ver)».

### 2.6 En el teléfono y por WhatsApp

**Teléfono** (`13-ux` D.5): botones de 48 px o más, en el tercio de abajo, con una mano; la cadena en 6 renglones de una línea; «Corregir» abre una hoja inferior al 90 % de la pantalla. Sin señal: «Guardado en el teléfono. Se envía solo cuando vuelva la señal (2 pendientes)». La hora que vale es la del toque, no la del envío.

**WhatsApp** (el hilo de `src/entities/mensajes.ts`): se conserva lo que ya funciona (plantilla `causa`, recordatorio a los 30 min, escalado a las 2 h) y se agregan dos pasos. Ambos caen dentro de la ventana de 24 h, así que pueden ser texto libre y no necesitan plantilla nueva. Así lo explica la cabecera de `mensajes.ts`: «Lo que sigue a la respuesta de la persona… ya va dentro de la ventana de 24 h y puede ser un mensaje libre».

```
TRIM · P-201B de La Ceiba paró el 2 de oct, 03:52. Ninguna señal dice qué se
dañó. ¿Qué encontró? Responda con un número.
1) Sello mecánico · 2) Rodamientos y cámara de empuje · 3) Otra parte · 0) Otra cosa
                                                         ← plantilla actual, igual
> 2
TRIM · ¿Qué vio en los rodamientos? 1) Ruido o vibración · 2) Se recalentó · 3) Otra cosa
> 2
TRIM · ¿Se regó crudo o agua aceitosa? 1) No · 2) Sí, crudo · 3) No sé
                                                         ← NUEVO, solo si aplica
> 1
TRIM · Así queda lo que usted contestó: P-201B, rodamientos, se recalentó,
no se regó nada. El resto del reporte lo revisa su supervisor.
1) Está bien · 2) Algo está mal                          ← NUEVO: confirmación
> 1
TRIM · Listo. Gracias, Jairo. Su respuesta queda guardada a las 04:31.
```

El operador solo avala lo que contestó: la parte, lo que vio y si se regó algo. Esos pasos quedan `confirmado` con su nombre. Dónde se trabó, la Causa y el Detalle que TRIM propone a partir de la parte quedan con origen `C` hasta que los confirma sup, prod, jefe o conf (confirmación por paso, §2.4; P1 §1.3). (Que los rodamientos de una bomba de reinyección lleven a esa pareja, con choke Planta, sigue `REGLAS_ANH` v1 de P1 §2.1 (parte `rodamientos` → `NP_SUP/falla-rodamiento-cojinete-bearing-box`; con sello, succión o sin parte → `NP_PROC/parada-estacion-bombeo-afecta-pozos`). Los textos de las opciones de «qué vio» son los de `MODO_EN_CAMPO` de hoy y aquí solo se ilustran.)

- **«2) Algo está mal»** responde: «Entendido. Lo revisa el supervisor en la pantalla de Identificar; usted no tiene que hacer nada más». La corrección de un eslabón técnico (choke, N1) no se hace por chat: se le pasa a quien tiene `causa:completar` o `causa:declarar` en pantalla. Así nadie tiene que escribir códigos en un teclado con guantes.
- **El hilo en pantalla** (`HiloWhatsapp` de `Causa.tsx`) suma los pasos «confirmó» o «marcó para revisar».
- **Cierre del día por WhatsApp (desde F3)**: a las 22:00, al supervisor del campo: «TRIM · La Ceiba: faltan 3 paradas de hoy para el reporte ANH de mañana. Ver: {enlace}». Esto **necesita una plantilla nueva** («utilidad»), porque puede caer fuera de la ventana de 24 h. La hora (22:00) es una propuesta y se configura. **Antes del 1-dic (F2) no hay WhatsApp:** a las 05:00 el aviso de lo `pendiente` o `por-precisar` sale **en pantalla y por correo** (P1 §6 F2; pedido P-6).
- **Riesgo declarado:** WhatsApp necesita red (`09b` §6, «Offline duro»). La pantalla del teléfono, en cambio, funciona sin red. Se dicen las dos cosas, sin prometer de más.

### 2.7 Qué ve quién en Identificar

| Rol | Primer panel | Qué puede hacer |
|---|---|---|
| oper, tec | «POR CONTESTAR» (solo las preguntas; la cadena técnica va plegada con la línea «lo propone TRIM; lo confirma su supervisor») | Contestar las preguntas 1 a 4, «Confirmar lo que contesté», «Algo está mal» |
| sup | «CIERRE DE HOY · {n} faltan» con los grupos de cadena idéntica | Confirmar en lote, corregir un paso, escalar |
| prod, jefe, conf | «REVISAR» (marcadas «algo está mal», reglas que más se corrigen) | Corregir cualquier eslabón con motivo obligatorio; queda la versión anterior al lado (`13-ux` D.6, «Atribución ya firmada») |
| reg | No entra aquí: ve el resultado en §6 | — |

## §3 Choke

### 3.1 Dos cosas distintas con dos nombres en pantalla

R2 §2.3 separa dos cosas:
- **el choke del campo** (cuál de los cuatro tiene hoy el menor potencial);
- **el choke de cada parada** (dónde se originó la restricción; es `choke_mod`).

Si la pantalla las confunde, todas las paradas de La Ceiba saldrían como «Planta» (R2 §2.3, punto 1). Por eso cada una lleva su propio rótulo y nunca se usa la palabra suelta «choke»:

| Concepto | Rótulo en pantalla | Ayuda (ⓘ, texto exacto) |
|---|---|---|
| Choke del campo | **«Qué limita hoy al campo»** | «De los tres tramos con potencial (pozos, que incluye el yacimiento; planta; y exportación), el que menos deja pasar. Se calcula con los potenciales firmados: no se declara.» (P1 §1.7: `ChokeCampo` tiene tres valores.) |
| Choke de la parada | **«Dónde se trabó»** (eslabón 2 de la cadena) | «Dónde se originó la restricción que paró el pozo: en el pozo, en la planta, en la exportación o en el yacimiento. No es la válvula choke de la cabeza del pozo (Circular ANH 024, p. 4).» |
| Choke de un equipo (configuración) | **«Si este equipo para, se traba en…»** | «Un equipo que sirve a un solo pozo es Pozo; uno que sirve a varios es Planta (criterio de Edinson para el transformador). Lo firma el administrador.» |

Palabras de los cuatro valores, en pantalla (etiquetas de P1 §1.2): **Pozo · Planta · Exportación (evacuación) · Reservorio**. El ⓘ de «Reservorio» dice «el yacimiento: conificación, declinación, falta de soporte de presión». El valor que viaja en el JSON lo decide la tabla de serialización (R2 §3.0). En pantalla nunca se muestra la cadena del JSON, salvo en la vista de regulatorio.

### 3.2 Para quién y cómo se ve

**Gerente (ger), en Resumen › POR CAMPO.** Una barra horizontal por campo, partida en 4 tramos en grises de distinta luminancia (ISA-101: el reparto no es una alarma, así que no lleva color). Cada tramo tiene su texto encima. Debajo va una frase:

```
LA CEIBA   1.046 bbl diferidos
[████████████████ Planta 61 % ][████████ Pozo 31 %][▌Export. 8 %]   Reservorio 0
Se trabó sobre todo en la planta: el agua no tuvo a dónde ir (P-201B).
```

La frase la arma el motor con el tramo mayor y el equipo que más aporta a él. Así se cumple la regla del dueño: campo → dónde → qué equipo, sin datos técnicos.

**Ingeniera de producción (prod), en Producción o Diferidos.** «Qué limita hoy al campo» (es `chokeDominante`, calculado, P1 §1.7; `Campo.choke` deja de leerse) con los 4 potenciales como indicadores analógicos (barra con marcador, `12-estandar` E.4). El menor lleva la palabra **«limita»** y un contorno más grueso; no se marca con color, porque no es una alarma. Si dos potenciales empatan, sale el aviso «Dos tramos tienen el mismo potencial: explique por qué», como pide la NSTA (R2 §1.2a). Al lado va «desde cuándo limita» y el potencial firmado con su fecha y su autor (`15-ux` C, bloque 2).

```
QUÉ LIMITA HOY AL CAMPO · Guacamayo                     potenciales firmados 1-oct
Pozos        ├──────────────────────────────▲──────┤  9.200 bbl/d
Planta       ├────────────────────────────────▲────┤  9.900 bbl/d
Exportación  ├═══════════════════════▲═══════════════┤  6.800 bbl/d  ◄ limita
Reservorio   (sin potencial propio: va con Pozos)
```
(Las cifras son ilustrativas. Solo los 6.800 bbl/d de Exportación de Guacamayo son del demo, según R2 §2.1. Lo mismo vale para los porcentajes de La Ceiba de arriba y las pérdidas de §4.3: **todas las cifras de los bocetos de este documento son de ejemplo y no son datos**.)

**Supervisor (sup), en Turno.** Una línea: «Hoy limita: Planta · disposición de agua (P-201B fuera, 1 de 3 bombas)».

**Operador y técnico.** No se les muestra el choke del campo. «Dónde se trabó» va dentro de la cadena técnica, que en su teléfono está plegada con la línea «lo propone TRIM; lo confirma su supervisor». Nunca se les pide escogerlo ni confirmarlo (`13-ux` D.5; P1 §1.3, confirmación por paso).

**Jefe, confiabilidad y planeadora (Superficie, `Equipo.tsx`).** Cada equipo muestra su choke de configuración: «Planta · le sirve a 12 pozos» o «Pozo · solo LC-14».

**Regulatorio (reg).** En §6, el reparto por choke del día y el valor exacto que sale en `choke_mod`.

### 3.3 Mercado

TRIM tiene hoy un cuarto valor, «Mercado» (`Campo.choke`, `src/entities/tipos.ts:102`). La ANH no lo tiene (R2 §2.2). En pantalla, «Mercado» se vuelve un **subnivel de Exportación** («Exportación · el cliente no recibe»), nunca un quinto tramo de la barra.

### 3.4 Campos de gas: la «tolerancia diferente» de Edinson

Edinson [31:08]: «si son de gas pues tienen una tolerancia diferente en cuanto a paradas de pozo». **NO VERIFICADO qué quiso decir**: puede ser una duración mínima, otra forma de medir el diferido o la nominación. Va como pregunta en §11.2. Mientras tanto, la experiencia respeta tres límites:

1. **El reporte ANH no tiene tolerancia.** Una parada cuenta «con independencia de su duración» (C24 p.3). Ninguna configuración de tolerancia puede sacar una parada de `paradas_pozo`. Todas siguen en el cierre del día (§6), aunque sea para confirmarlas en lote.
2. **La tolerancia solo puede tocar la gestión.** Puede decidir cuándo se le pregunta a una persona (por ejemplo, no mandar WhatsApp por cierres de gas de menos de N minutos y dejarlos para el lote del supervisor, como recomienda `09b` §6 con el escalamiento por duración) y qué entra a las alertas. Si producto la acepta, sería un parámetro por campo, firmado y rotulado en pantalla: «Paradas de menos de 30 min: se confirman en lote, sin preguntar» (pedido P-18).
3. **Unidades y palabras de gas.**
   - En un campo de gas, el diferido se muestra en KPC (`15-ux` A.5), nunca sumado a barriles sin decir el factor.
   - La restricción del cliente se muestra como «Exportación · nominación» (subnivel, §3.3).
   - La diferida ANH del modelo de P1 (`DiferidaAnhDia`) es de crudo (`prdOilBbl`). Para un campo de gas, la pantalla dice «diferida ANH: solo crudo en este plan; el gas, pendiente de definir» y no muestra un cero.
   - SPE-36848 dice que en gas solo hay pérdida real cuando no se cumple el DCQ (R2 §1.1). Es una lectura de gestión posible, **no** una regla ANH.

## §4 Pérdidas

### 4.1 Lo que el usuario tiene que entender en una línea

La pantalla repite siempre la misma regla, con las palabras de la circular (C24 p.5, Paso 3), y la deja en el ⓘ de cada cifra de pérdida:

> «**Diferida**: no salió del pozo. **Pérdida**: salió y no se pudo vender (se regó, se quemó, se venteó o se rechazó).»

Nunca se suman. La pérdida va en su propia línea, en bbl de crudo y en KPC de gas. KPC es la unidad usual en Colombia (`15-ux` A.5). La conversión a las unidades del JSON (el balance de gas pide mmscfd, R1 §4.5) solo la ve regulatorio.

### 4.2 Captura por tipo de pérdida

| Tipo (lista de C24 p.4) | Con o sin parada | Quién la registra y cuándo | Cómo se sabe el volumen (método, R2 §6.3) | Evidencia mínima | Nota |
|---|---|---|---|---|---|
| **Derrame / pitera / fuga** de la cabeza de pozo al PMO | Con parada (la línea se cerró) o sin parada (se reparó con el pozo andando) | **oper o sup en el sitio, en el momento**, desde el teléfono: tipo, dónde, desde qué hora, si ya está controlado y una foto. El volumen lo cierra **prod** después | Estimado en sitio (área × espesor) o por balance; se descuenta lo recuperado | Al menos **1 foto**; hora; ubicación (pozo, línea o tanque) | Un derrame es además un incidente a notificar en 24 h (Res. 40537 art. 59, R1 §3.6). TRIM muestra ese reloj a reg, pero no notifica por la operadora |
| **Quema en tea** | Casi siempre sin parada; con parada si el compresor disparó y se cerraron pozos | **Automática** si hay medidor de tea (TRIM propone el evento y prod lo confirma); si no, **prod** la declara por balance de gas | Medido o por balance | El tag del medidor o la hoja de balance | Va a `quemado` del balance de gas (R2 §4.3) |
| **Venteo intencional** | Sin parada | **prod**, o HSE a través de prod | Estimado (caudal de alivio × tiempo) | Informe | **No tiene casilla en el JSON V3.1 (NO VERIFICADO dónde va, R2 §4.3).** En pantalla lleva la etiqueta «sin casilla en el reporte ANH: a confirmar» |
| **Rechazo por especificación** | Sin parada | **prod**, con el certificado de la LACT (reg lo ve, pero no tiene `perdida:registrar`, P1 §1.15) | Solo lo que **no** se reprocesó | Certificado de calidad | Antes del volumen se pregunta: «¿Se recirculó al tratamiento?». Si se recirculó, no es pérdida (R2 §4.3) |
| **Daño de equipo con pérdida** (rotura de tanque, alivio a la fosa) | Con o sin parada | oper o sup en el sitio; prod cierra | Por balance del equipo | Foto e informe | — |
| **Crudo en el agua de disposición** | Sin parada, continua | **prod**; se calcula sola si hay analizador de aceite en agua (OIW) | Medido (OIW × caudal de agua) | Serie del analizador | **NO VERIFICADO que la ANH la espere** (R2 §4.3). Sale como «pérdida continua, estimada» y queda **fuera del total reportado** hasta que la operadora decida incluirla en su configuración firmada |

Pantalla de captura en el teléfono (oper o sup), entrando desde Turno → «Registrar una pérdida», o desde la Pregunta 4 de una parada:

```
REGISTRAR UNA PÉRDIDA                                    La Ceiba
¿Qué pasó?        [Se regó crudo] [Pitera o fuga] [Tea o venteo] [Otra]
¿Dónde?           [Pozo LC-14 ▾]  o  [Línea · Tanque · Planta]
¿Desde qué hora?  02:10  (hora de la parada de LC-14)        [cambiar]
¿Ya está controlado?          [Sí]  [No, sigue saliendo]
Foto (al menos una)           [ Tomar foto ]  ● 1
¿Cuánto, más o menos?         [No sé]  [Menos de 1 bbl] [1–10] [10–100] [Más de 100]
                                     (el volumen exacto lo cierra producción)
                                  [ Registrar la pérdida ]
Queda registrada por Jairo Peña · 02:41 · se envía al volver la señal (1)
```

- Cómo cae cada respuesta en `EventoPerdida` (P1 §1.9):
  - «Se regó crudo» → `derrame`; «Pitera o fuga» → `fuga`; «Tea o venteo» → `tea` o `venteo` (se pregunta cuál); «Otra» → `rechazo`, `dano-equipo` o `arrastre-agua`, que los escoge prod.
  - «¿Ya está controlado? No» → `fin: null`. La foto va a `evidencia`. Se guarda con `estado: 'registrada'`, y prod la pasa a `'confirmada'`.
  - Quién puede: `perdida:registrar` (sup, oper, prod).
- El rango de volumen evita que el operador tenga que escribir un número. La circular deja el volumen a quien tiene la metodología (C24 p.7). La ingeniera de producción después escribe el número y su `metodo`. Ya está en el modelo: `EventoPerdida.volumen: number | null`, `rangoEstimado` (`'menos-1' | '1-10' | '10-100' | 'mas-100' | 'no-se'`) y `donde`. Para pasar a `confirmada` hacen falta volumen y método (P1 §1.9).
- **¿Fue planeada?** En la C24 una pérdida puede ser planeada (R1 §3.3; `EventoPerdida.planeacion`). Al operador no se le pregunta. A prod se le pregunta solo en tea y venteo: «¿Esta quema o venteo estaba programado?», con «Sí, planeada» y «No planeada».
- **Quién la causó** (eslabón 1) no se le pregunta al operador. Lo propone TRIM (falla de una línea propia → «Operador · Mantenimiento») y lo cierra prod. Es el dato que puede cambiar la plata, por el posible gravamen (C24 p.4; R2 §4.1).

### 4.3 Cómo la ve el gerente

En Resumen, debajo del diferido y **separada por una línea**:

```
PÉRDIDA · lo que salió y no se vendió                 octubre, en curso
  14 bbl de crudo   ·   1.240 KPC de gas         (cifras de ejemplo)
  por campo:  La Ceiba 12 bbl · Morichal 2 bbl · Guacamayo 1.240 KPC (tea)
  quién:      nuestra 12 bbl · de terceros o la naturaleza 2 bbl     ⓘ
```

- El ⓘ de «quién» dice: «La pérdida "podrá estar sujeta a gravamen por parte de la ANH, de acuerdo con la responsabilidad de la compañía operadora y la naturaleza del evento" (Circular 024, p. 4). La norma que fija cuándo no está publicada (NO VERIFICADO).»
- No lleva tags, ni partes, ni N1/N2.
- Al tocar «La Ceiba 12 bbl» se abre el panel con la lista de eventos: tipo, fecha, método del volumen y la foto.

### 4.4 Cómo la ve regulatorio

En §6, cada evento de pérdida del día con su destino en el JSON (`balance_fluido_crudo.perdidas`, `balance_fluido_gas.quemado`) y el **cuadre**: «Eventos registrados: 12 bbl. Casilla `perdidas` del balance de la facilidad: 12 bbl. Cuadra». Si no cuadra, se muestra la diferencia y no se reparte (R2 §5.4, punto 7).

## §5 Conversión del árbol de la operadora

### 5.1 Quién hace qué

| Rol | Capacidad (P1 §1.15) | Qué hace |
|---|---|---|
| **adm** | `anh:conversion` | Carga el `ArbolOperadora`, arma la `TablaConversion`, mira el impacto y la deja «lista para firmar» |
| **conf** | `anh:comentar` (P1 §1.15) | Revisa las parejas técnicas (equipos, partes) cuando adm lo invita y escribe su observación en `FilaConversion.nota`, sin cambiar el destino. `reg` también tiene `anh:comentar` |
| **reg** | `anh:firmar` | Firma la versión y fija «rige desde». Sin su firma no se usa |
| ger | — | No entra. Ve solo que existe una versión vigente |

Es una **página con dirección propia** (URL), no un modal. Es trabajo de horas, a veces de varios días, y se comparte con un enlace (`13-ux` D.1, nivel 5). Va dentro de Configuración, como la sección «Árbol de paradas y conversión a la ANH», con 5 pasos visibles arriba: **1 Cargar · 2 Mapear · 3 Revisar · 4 Ver el impacto · 5 Firmar**. Se puede volver a cualquier paso; el borrador se guarda solo.

### 5.2 Paso 1 · Cargar el árbol propio, de cualquier tamaño

- **Tres entradas:**
  - «Subir Excel o CSV», con columnas código, código del padre y texto;
  - «Pegar desde una hoja de cálculo»;
  - «No tenemos árbol: usar el de la ANH». Esta última es para la operadora chica. Con ella no hay tabla de conversión: las preguntas de campo son las de §2.4.
- **Lo que TRIM dice al cargar:** «1.214 causas en 6 niveles · 1.170 son hojas · 3 errores». (Las cifras son de ejemplo. Del árbol de Ecopetrol solo se sabe que es «unas 10 veces» la matriz: Transcript [31:08]. Su estructura es **NO VERIFICADO**, R2 §5.1.)
- **Errores que bloquean la carga:** código repetido, padre que no existe, ciclo. Cada uno con su renglón y su fila del archivo.
- **Si la operadora ya tiene su propio cruce con la ANH** (es posible: ya reportaban con la Circular 003), se sube como segunda columna: código propio → N1_KEY y N2. TRIM lo toma como **sugerencia** y no como verdad, y lo valida en el paso 3.
- **Árbol pequeño (3 o 4 hojas):** TRIM avisa de una vez: «Sus 4 causas son más gruesas que las de la ANH: cada una cubre varias. Le proponemos dejarlas como "Hay que preguntar" con las opciones de cada una». Es el caso de uno a muchos (R2 §5.4, punto 3).

### 5.3 Paso 2 · Mapear cada hoja con ayuda

Dos columnas. A la izquierda va el árbol propio, plegable y con buscador. A la derecha va el destino de lo que se escoja.

```
ÁRBOL DE PARADAS · Operadora X v3 → ANH (Circular 024)     borrador · guardado 10:42
Filtrar: [Sin mapear 812] [Ambiguas 37] [Hay que preguntar 54] [Con nota 9] [Todas]
Buscar: [ transformador                ]
─────────────────────────────────────────┬──────────────────────────────────────────
▾ 2 ELÉCTRICO                             │ DESTINO de «2.3.1 Transformador de pórtico»
  ▾ 2.3 Transformadores                   │ ( ) Una causa ANH
    ● 2.3.1 Transformador de pórtico   ◄  │ (•) Depende de si fue planeada
    ○ 2.3.2 Transformador de pozo         │     Planeada:    Planeada - Mant. Eléctrico › Transformador
    ○ 2.3.3 Transformador elevador ESP    │     No planeada: No planeada - Eléctrica interna › Falla transformador
  ▸ 2.4 Variadores (hereda de 2)          │ ( ) Hay que preguntar en campo
                                          │ Responsable por defecto: [Operador · Mantenimiento ▾]
                                          │ SUGERENCIA · las palabras «transformador» coinciden;
                                          │ su hermana 2.3.2 ya va igual. [Usar] [Ver otras]
                                          │ Aplicar también a: [ ] las 2 hermanas sin mapear
─────────────────────────────────────────┴──────────────────────────────────────────
Cubre 402 de 1.170 hojas · 35 %                          [Siguiente: revisar]
```

- **Los tres destinos se dicen en palabras** y caen en `DestinoConversion` (P1 §1.10):
  - «Una causa ANH» = `pareja`;
  - «Depende de si fue planeada» = `segun-programa`;
  - «Hay que preguntar en campo» = `precisar`, con la lista de opciones permitidas.
- **El choke no está en esta pantalla.** Se explica con una línea fija: «Dónde se trabó no va aquí: lo decide el equipo de cada parada (pórtico = Planta; transformador del pozo = Pozo)» (R2 §5.4, patrón 1; P1 §1.10).
- **Herencia.** Mapear un nodo intermedio cubre sus descendientes, salvo los que tienen fila propia (P1 §1.10, `FilaConversion.codigo`). Es lo que vuelve manejable un árbol de mil hojas: se mapea en el nivel 2 o 3 y se corrigen las excepciones. Cada hoja heredada dice «hereda de 2.3». Abrirla muestra de qué nodo hereda y deja sobrescribir.
- **Sugerencias, nunca automáticas.** TRIM propone una pareja con su porqué en palabras:
  - «palabras en común»;
  - «su hermana ya va así»;
  - «el cruce que ustedes subieron dice esto»;
  - «así la confirmó la gente en campo 14 veces», cuando ya hay historia.

  Junto a la sugerencia sale «Ver otras», con las parejas parecidas. Esto ataja el error típico de mapear por parecido del nombre («Hurto» frente a «Hurto de instrumentación», R2 §5.4). Hay aceptación en lote, pero solo de sugerencias de un mismo nodo padre, y la persona la confirma con un toque.
- **Hojas ambiguas.** Una hoja es ambigua cuando su texto coincide con dos o más N1 distintas, o cuando su nombre no dice si fue planeada («Mantenimiento eléctrico»: ¿`P_MANT_ELE` o `NP_ENINT`?, R2 §5.4). TRIM la marca y propone «Depende de si fue planeada».
- **«Hay que preguntar» pide escribir la pregunta de campo.** Ejemplo: «¿Se dañó el transformador del pórtico o el del pozo?», con 2 a 6 opciones. Esa pregunta es la que verá el operador como +1 toque (§2.2). Se guarda en el destino `precisar` como `{ pregunta, opciones: Array<{ pareja, texto }> }`: el arreglo guarda el orden de los botones (P1 §1.10).
- **Comodines.** Mandar una hoja a «Orden público - Pendiente detalle» o a «Otro evento natural» exige una nota (R2 §5.4: «ninguna hoja va a un comodín sin justificación»).

### 5.4 Paso 3 · Revisar (validación de la tabla)

Lista de hallazgos, cada uno con su enlace a la hoja. Los que **bloquean** la firma:
- hojas sin destino;
- un N2 que no pertenece a su N1. No debería poder ocurrir si se mapea desde la pantalla, pero sí puede llegar desde un Excel importado;
- un `segun-programa` cuyo lado planeado no es `P_*` o cuyo lado no planeado no es `NP_*`;
- un comodín sin nota.

Los que solo **avisan**:
- parejas que cambian de N1 entre la circular y el Diccionario («Falla Instrumento/sensor», R1 §4.4; `EQUIVALENCIA_VERSIONES` de P1). El aviso dice «Esta causa está en Control en la circular y en Instrumentación en el Diccionario: saldrá según la versión que su operadora reporta»;
- muchas hojas que van a una misma pareja genérica.

### 5.5 Paso 4 · Ver el impacto antes de publicar

Antes de firmar, TRIM pasa la tabla nueva sobre las paradas de un período (por defecto, los últimos 3 meses) y muestra:

```
IMPACTO DE LA VERSIÓN 4 · sobre jul–sep (1.211 paradas)              solo simulación
                                   versión 3 (vigente)   versión 4 (borrador)
Quedan con causa ANH completa          1.088                1.150
Piden una pregunta más en campo          118                   61
Sin causa (no se podrían reportar)         5                    0
Cambia la causa ANH de                     —                   37 paradas   [ver cuáles]
Barriles por causa ANH (top 5)       [barras lado a lado, en grises]
Cuadre: Σ por su árbol = Σ por la ANH = 31.902 bbl              cuadra
Lo ya reportado NO cambia: la versión 4 rige desde la fecha de firma.
```

- «Ver cuáles» lista las 37 paradas con la causa de antes y la de después, la hoja de origen y los barriles.
- Lo que ya se reportó no se reescribe: cada `ParadaAnh` guarda su `versionConversion` (P1 §1.5 y §1.10; R2 §5.4, punto 4; el IDP del lago es inmutable, C24 p.9).

### 5.6 Paso 5 · Firmar y versionar

- Modal de firma (decisión irreversible, `13-ux` D.1):
  - texto: «Está firmando la tabla de conversión v4 de Operadora X → Circular ANH 024. Cubre 1.170 hojas: 1.055 a una causa ANH, 61 por planeación, 54 preguntan en campo. Rige desde el 22-oct-2026, 00:00»;
  - campo obligatorio «Rige desde»;
  - botón «Firmar la versión 4».
- **Historial de versiones**: quién la preparó, quién la firmó, desde y hasta cuándo rigió, y las diferencias con la anterior. Es el mismo patrón de «VERSIONES FIRMADAS» de `Configuracion.tsx`.
- **Descargar la tabla** en Excel, para que el equipo de la operadora la revise fuera de TRIM.

## §6 Cierre regulatorio del día

### 6.1 El reloj

El IDP del día operacional anterior, con corte a las 23:59:59, debe salir **antes de las 07:00** (C24 p.8–9; Res. 0651 art. 15; Res. 40537 art. 51). Si la ANH lo rechaza, hay **1 hora** para corregir y retransmitir; mientras tanto, el reporte se tiene por no recibido (Res. 0651 art. 15.2, añadido por la Res. 0052/2026; R1 §3.1). La pantalla está construida alrededor de ese reloj.

La línea de tiempo del cierre y quién recibe qué (propuesta; las horas intermedias se configuran):

| Hora (COT) | Qué pasa | Quién lo ve |
|---|---|---|
| Durante el día | Las paradas se proponen y se confirman (§2) | sup, oper, tec |
| 22:00 | Resumen al supervisor: «faltan 3 paradas de hoy» (WhatsApp desde F3; antes del 1-dic, solo en pantalla) | sup |
| 23:59:59 | Corte. Las paradas abiertas se cierran a esa hora y siguen en el día siguiente (`abiertaAlCorte`, P1 §1.5; regla NO VERIFICADA con la ANH, R1 A-11) | — |
| 05:00 | Si queda algo `pendiente` o `por-precisar`: aviso a reg, a sup y al jefe del área | reg, sup, jefe |
| antes de 07:00 | Validar, generar y entregar | reg |
| Rechazo + 1 h | Corregir y retransmitir | reg (con sup o prod para corregir la parada) |

### 6.2 La pantalla «Cumplimiento regulatorio»

Reemplaza a la actual `Regulatorio.tsx` (6 casillas PRODML, R4 §3.1). Es la pantalla de inicio de `reg`. Tiene un objeto primario: **el reporte de hoy** (`13-ux` D.7, regla 10).

```
CUMPLIMIENTO REGULATORIO · reporte del 20-oct-2026   Contrato DEMO-001 · La Ceiba (demo)
Sale antes de las 07:00 · quedan 1 h 48 min                             [borrador]
─────────────────────────────────────────────────────────────────────────────────
1 PARADAS DEL DÍA   14                                     ▸ ver las 14
  completa 11 · falta confirmar 2 · falta un dato 1 · sin causa 0
  ◆2 LC-21  falta un dato: «¿estaba planeada?»          [Pedir a Nelson Ortiz]
     LC-03, LC-09  falta confirmar (TRIM las dedujo)    [Pedir a Nelson Ortiz]
2 VALIDACIÓN PROPIA                                       ▸ ver detalle
  Estructura del Schema V3.1 · Catálogo · Planeada ↔ causa · N2 de su N1 ·
  Horas (fin ≥ inicio) · Nodo de paradas presente
  1 bloquea · 2 avisos
  ◆1 LC-21: falta «¿Planeada?» (los 15 campos son obligatorios)
3 PÉRDIDAS DEL DÍA  1 · 12 bbl de crudo → balance de la facilidad CPF-1 · cuadra
4 LO QUE APORTA TRIM   paradas_pozo completo · fragmento de produccion_por_pozo ·
  detalle de pérdidas por facilidad. El resto del IDP lo arma su sistema.  ⓘ
─────────────────────────────────────────────────────────────────────────────────
[ Generar el archivo ]   (se activa cuando no haya nada que bloquee)
```

- **Estados del envío** (`EstadoEnvio` de P1 §1.14), en pantalla:
  - `borrador` → «borrador»
  - `validado` → «listo para entregar»
  - `entregado` → «entregado · esperando respuesta»
  - `aceptado` → «aceptado»
  - `rechazado` → «rechazado · corrija antes de las 08:14»
  - `reemplazado` → «reemplazado por la corrección 1»

  Siempre en texto, con su forma (§9).
- **«Pedir a…»** manda el pedido por WhatsApp y en pantalla a quien tiene `anh:clasificar` en ese campo. reg no clasifica (P1 §1.15 no le da `anh:clasificar`). Puede ver la cadena y pedir.
- **Lo propuesto sin confirmar** (`propuesta`): no bloquea. Sale con el origen que diga `FormaSalidaAnh.origenDeducido` (por defecto `C`, provisional, P1 §1.3) y se avisa así: «2 paradas van como calculadas por TRIM, sin que nadie las confirmara». **NO VERIFICADO** que la ANH acepte una clasificación con origen `C` (R1 A-13).
- **Lo que no tiene causa** (`pendiente`) **bloquea** el botón «Generar el archivo», porque los 15 campos son obligatorios y no hay un valor «sin identificar» (R2 §3.3). La pantalla nunca ofrece rellenarlo. Como dice P1 §2.6, reg puede decidir de forma expresa «Entregar sin LC-21 y enviarla después». Eso abre un modal con el motivo obligatorio, deja un hallazgo de aviso en el envío y pone LC-21 en la lista «por enviar como extemporánea o corrección».
- **Validación propia**: cada `HallazgoValidacion` se muestra en una frase y con enlace a la parada. Ejemplo: «LC-14: el detalle "Falla ESP" no pertenece a la causa "No planeada - Instrumentación"». La `ruta` técnica (`segmento_datos.paradas_pozo[3].cau_niv2`) va en el ⓘ, para reg y para el integrador.
- **Ver el archivo**: un selector «Como se lee» / «Como lo lee la ANH». El primero es una tabla de las 15 columnas con etiquetas. El segundo muestra las tuplas `[Valor, Origen, Unidad]` exactas.
- **«Lo que aporta TRIM»** sigue P1 §4.1:
  - `paradas_pozo` completo;
  - el fragmento de `produccion_por_pozo`, si la operadora lo pide;
  - el detalle de pérdidas por facilidad, para que el operador lo concilie con su balance.

  `pruebas_potenciales` solo se lee. El ⓘ dice qué arma el sistema IDP de la operadora (tanques, medidores, balances). Con el modo de entrega `'fragmento'` (el que viene por defecto, `Config.anh.entrega`), lo que se «genera» es ese fragmento con sus tuplas exactas.

### 6.3 Generar, entregar y, si la ANH rechaza, corregir en 1 hora

1. «Generar el archivo» produce el JSON con su nombre (`NOMBREOPERADORA_CONTRATONUMERO_yyyymmddTHHMMSS.json`, C24 p.9) y su huella SHA-256.
2. Con el modo `'fragmento'` (el que viene por defecto), el botón es **«Descargar para su sistema IDP»**. Después de que la operadora entrega el IDP completo, el estado se marca a mano («Se entregó a las 06:20»), con quién y cuándo. La respuesta de la ANH también se registra a mano («Aceptado» o «Rechazado» + motivo), hasta que exista integración con el canal. Con el modo `'archivo'` (solo ambiente de pruebas, P1 §4.1), el botón es «Entregar a la ANH», con un modal que nombra lo que se entrega: «Está entregando OPERADORADEMO_DEMO001_20261021T061200.json · 14 paradas · huella 3f9a…». El primer bloque del nombre es la **operadora** y el segundo el **contrato**, en mayúsculas, sin tildes ni espacios (C24 p.9, 4.1 y 4.3-i); nunca el nombre del campo. Los ejemplos usan identificadores `DEMO-`, como pide P1 §6.
3. **Rechazo.** Arriba de todo aparece una banda de alarma (prioridad 1, con forma y texto, §9): «**Rechazado** a las 07:14 · motivo de la ANH: "…" · corrija antes de las 08:14 · quedan 52 min». Debajo:
   - los hallazgos que explican el rechazo, enlazados a cada parada;
   - el botón «Preparar la corrección 1», que pide **motivo obligatorio** y arma el `EnvioIdp` con `tipoEnvio: 'CORRECCION'`, `correccion: 1` y `reemplazaA`;
   - los 4 datos que exige la Res. 0651 art. 15.2 par. 3 (identificador del envío, fecha y hora, número de corrección, motivo), siempre a la vista y llenos solos.
4. **Inconsistencia de contenido** detectada por la propia operadora (art. 15.2 par. 2): «Encontré un error en un reporte ya entregado». Abre el mismo flujo, con el reloj de 1 h desde ese momento.
5. **Nunca se edita un archivo entregado.** Una corrección es un archivo nuevo, enlazado al anterior (R1 R-14; P1 `reemplazaA`).

### 6.4 Historial y descargas

- Una franja con los días del mes. Cada día muestra su estado con forma y palabra: aceptado; rechazado y corregido; entregado tarde (`EXTEMPORANEO`); sin entregar.
- Tocar un día abre su cadena de envíos: original → corrección 1 → …, con la hora, quién lo hizo, el motivo, la huella y la respuesta de la ANH.
- **Descargas:** cada JSON tal como salió (inmutable); un CSV de las paradas del día con la clasificación y su procedencia (quién confirmó qué, `DatoClasificado`); y el paquete de evidencia por parada (`desc_evid` con la línea de tiempo del PLC, como `Evidencia.tsx`).
- Una línea fija: «Obligatorio desde el 1-dic-2026 (Circular 024). NO VERIFICADO si la Res. 0592/2026 cambia esa fecha (R1 A-16)».

## §7 Métricas de confiabilidad modulares

### 7.1 Cómo una operadora arma su perfil (adm, `metricas:perfil`)

Es una sección de Configuración, «Métricas de confiabilidad», y se firma como el resto de la configuración (`PerfilMetricas`, P1 §1.11). Tiene cinco bloques, en este orden:

1. **Paquetes.** Una fila por paquete, con un interruptor, lo que trae y **los datos que necesita, dichos en palabras**:
   ```
   Núcleo · confiabilidad del equipo         siempre encendido   usa: el PLC
   Confiabilidad avanzada (Weibull, λ)       [ ]                 usa: el PLC con estado de marcha  ✓ disponible
   Electrosumergibles · run life             [ ]                 usa: historia de workover  — no conectada
   Trabajo y planeación                      [x]                 usa: SAP PM (órdenes, programa)   ✓ conectado
   Logística · el tiempo fuera en 5 tramos   [ ]                 usa: cierre en el teléfono (L3-L5, F4) · SAP PM + MM (L1, L2, L6, L7, F5)
   Predictivo de campo · rutas y campañas    [x]                 usa: rutas del programa del técnico
   Costos                                    [ ]                 usa: SAP CO  — no conectado
   ```
   La logística tiene interruptor desde F4: P1 adelantó L3, L4 y L5 a F4, calculados desde el cierre de la orden en el teléfono (P1 §6 F4, cambio P1-8). L1, L2, L6 y L7 necesitan SAP y llegan en F5; sus tarjetas dicen «llega con SAP» hasta entonces (S1 U1-10, C-1). Un paquete sin su dato se puede encender igual. Sus tarjetas dirán qué falta («falta la historia de workover»), nunca un cero (R3 §4.1).
2. **Cifra principal de cada familia.** Es el pedido de Edinson (Transcript [22:34]: «a veces a un área de confiabilidad no le interesa más el tiempo medio de reparación más que el tiempo entre fallas, entonces, o el tiempo de logística»). Una fila por familia, cada una con cuatro botones (los valores de `cifraPrincipal`):
   - «Tiempo entre fallas (MTBF)» = `N3`
   - «Tiempo fuera (MDT)» = `N4`
   - «Reparación activa (MART)» = `L4`
   - «Logística: movilización y repuesto» = `L3`

   Las cuatro opciones están disponibles desde F4 (feb-2027): `L3` y `L4` salen del cierre en el teléfono. Antes de F4 no hay pantalla de métricas modulares (§11.2).

   A la derecha se ve la tarjeta tal como quedará (§7.2).
3. **Base del tiempo entre fallas**: «Tiempo en marcha (operación)» o «Días de calendario». Va con este ⓘ: «La norma define el MTBF sobre tiempo en marcha (ISO 14224 / IEC 60050-192). En calendario, el número cuenta también las horas paradas» (R3 §1.4-b). La base sale escrita en cada tarjeta.
4. **Cómo llaman ustedes a cada cosa** (alias). Ejemplo: «Ustedes dicen "MTTR" a lo que la norma llama tiempo fuera (MDT)». El alias se usa como rótulo, y el ⓘ dice siempre el término ISO y la fórmula (R3 §4.1).
5. **Clases de orden y tipos de aviso del CMMS → clases de TRIM**. Tabla de dos columnas, sin valores por defecto (R3 §2.11: PM01, PM02 y PM03 no tienen un significado estándar).

Lo que **no aparece** en esta pantalla, porque no se configura: las fórmulas, el mínimo de 2 fallas, la exclusión de disparos y de paradas ajenas, y la población de fallas cerradas (R3 §4.1; P1 §2.10). Una línea al pie lo dice: «Esto es igual para todas las operadoras, para que un mismo número signifique lo mismo en todas partes».

Al firmar se fija «rige desde». Después, toda tarjeta calculada con la definición nueva lo dice: «con la definición vigente desde el 22-oct» (R3 §4.3, punto 5).

### 7.2 La tarjeta modular

```
BOMBAS DE REINYECCIÓN · La Ceiba                    oct-2025 a oct-2026
TIEMPO ENTRE FALLAS                                         base: en marcha
  45,8 días              ├──────[════▲═══════════]────────────┤
                          entre 25 y 92 días, 9 de cada 10 veces · 8 fallas
──────────────────────────────────────────────────────────────────────────
Tiempo fuera 2,1 d  ·  Reparación activa 6 h  ·  Logística 1,4 d      [ver los 5 tramos]
```

- **Arriba**, la cifra principal que escogió la operadora, con su barra de confianza (un indicador analógico gris: el ancho de la barra es la incertidumbre, `12-estandar` E.4).
- **Abajo**, las otras tres a un toque, más pequeñas. No están escondidas: es la misma tarjeta con otro orden.
- El ⓘ de cada cifra abre su ficha (`Cifra`, P1 §1.11): fórmula, n, base, período y definición (`N3@1`). Es el popover de procedencia de `13-ux` §3.3.
- Las cifras del ejemplo (45,8 días, banda de 25,4 a 92,1, 8 fallas) son las que calcula R3 §3.0 para P-201B. Las de la fila de abajo son ilustrativas.

### 7.3 Qué ve cada rol por defecto

Sigue R3 §4.2, con estos ajustes de experiencia:

| Rol | Qué ve | Cómo |
|---|---|---|
| ger | **Ninguna tarjeta de confiabilidad.** Una frase en Resumen: «La flota de electrosumergibles falla menos que hace un año» (W2 o E3), con su ⓘ | Regla del dueño |
| conf | Las tarjetas de §7.2 por familia, con la cifra principal; bad actors; «de qué fallan»; P-F y margen logístico; Weibull donde n alcanza | Confiabilidad |
| jefe | La tarjeta de su familia más costosa; los 5 tramos (§7.5); proactivo/reactivo (T1); disponibilidad partida en programada y no programada (N5) | Mantenimiento y Confiabilidad |
| plan | Backlog (T5), cumplimiento (T3, T4, P4), «¿alcanza el repuesto?» (L6, L7), retraso del cierre (T9) | Su pantalla de programa (§8.4) |
| prod | Disparos de electrosumergible por pozo (N9) y el run life si el paquete está | Electrosumergibles |
| tec, sup, oper | Ninguna métrica de flota. Solo «hace cuánto falló este equipo» en la ficha | — |

### 7.4 Las bandas de confianza, dichas en palabras simples

La banda es la del 90 % (NIST, R3 §3.0). En pantalla nunca se escribe «intervalo de confianza del 90 %». Se dice **«entre X y Y, 9 de cada 10 veces»**. Según cuántas fallas haya, cambia qué se muestra primero. Los umbrales 5 y 10 son **decisión de producto** (como el n ≥ 3 de Weibull, R3 §6 punto 17) y deben validarse con Edinson:

| Fallas en el período | Qué se muestra | Frase exacta (con cifras de R3 §3.0) |
|---|---|---|
| 0 | Solo la cota | «Sin fallas en el período: **al menos 159 días** entre fallas» |
| 1 | La cota; no hay promedio (regla n ≥ 2, `libro.ts:1281`) | «Una sola falla: no alcanza para un promedio. Al menos X días» |
| 2 a 4 | **La banda primero** y el número chico | «**Entre 58 y 1.032 días**, 9 de cada 10 veces. Con 2 fallas, el promedio (183 d) dice poco» |
| 5 a 9 | El número grande y la banda debajo | «45,8 días · entre 25 y 92 días, 9 de cada 10 veces» |
| 10 o más | El número; la banda en el ⓘ | «1.133 días» · ⓘ «entre 794 y 1.674» |

Reglas:
- La banda nunca lleva color. Es incertidumbre, no una alarma.
- Dos familias se comparan con sus bandas lado a lado. Si las bandas se tocan, la pantalla lo dice: «no se puede decir cuál es mejor con estos datos».

### 7.5 Los cinco tramos del tiempo fuera

Abre «el tiempo de logística» de Edinson en las marcas t0 a t5 (R3 §3.5). Es una barra horizontal partida en grises, con el nombre de cada tramo **escrito encima** (no en una leyenda):

```
TIEMPO FUERA PROMEDIO · bombas de reinyección · 8 fallas cerradas       2,1 días
│Detección │Aprobación│ Movilización y repuesto          │Reparación│Arranque│░sin dato░│
│  0,2 h   │  9 h     │  31 h                            │   6 h    │  1 h   │  3 h     │
 aviso del   orden      viaje, permisos, espera            trabajo    hasta que
 PLC a SAP   liberada   del repuesto, clima                en sitio   el PLC arranca
```

- Las palabras salen de las normas (R3 L1 a L5): **Detección** (t1−t0), **Aprobación** (demora administrativa, t2−t1), **Movilización y repuesto** (logística, t3−t2), **Reparación** (activa, t4−t3) y **Arranque** (t5−t4).
- **«Sin dato»** es un tramo rayado propio. Nunca se reparte entre los demás (R3 §3.5: «lo que falte se muestra como "sin explicar", nunca se reparte»). Su ⓘ dice qué marca falta, por ejemplo: «Falta la hora en que empezó el trabajo: llega con el cierre en el teléfono (§8)».
- La suma de los tramos es exactamente el tiempo fuera (invariante de R3 §4.3; P1 §2.10).
- **«¿Alcanza el repuesto?»** (L6), debajo de la barra: «El vigía avisa con 12 días de anticipo como mínimo. El rodamiento tarda 21 días en llegar: **no alcanza por 9 días**. Tenga uno en bodega o pídalo apenas avise». Lleva marca de aviso (prioridad 3), porque es una decisión pendiente. (Las horas y los días de esta sección son cifras de ejemplo.)

## §8 Programa del técnico sin papel

El problema, en palabras de Edinson (Transcript [22:34]): las órdenes en papel «las llenan de grasa o de mugre o de agua… a veces no es muy trazable la medida», y al final de la semana hay «un corre corre… para cerrar todas las órdenes». El pedido: «Ojalá el técnico pueda tener gestión sobre el programa que le va a llegar… preventivo, predictivo… una campaña de vibraciones o termografía».

Funciona igual en los dos modos de P1 §2.8 (`Config.trabajo.modo`):
- `'sap'`: la tarea viene de SAP y el cierre se devuelve a SAP;
- `'liviano'`: TRIM guarda la orden.

El técnico no ve la diferencia. Solo una línea de estado cambia: «Enviado a SAP» o «Guardado».

### 8.1 Su día en el teléfono (tec)

Es la evolución de «Mi trabajo de hoy» (`Trabajo.tsx`, captura `tec-trabajo-telefono.png`). Se conservan los paneles PARADOS y POR IDENTIFICAR (lo urgente sigue arriba). El panel «ÓRDENES EN SAP» de solo lectura se reemplaza por **«MI PROGRAMA DE HOY»**, con un renglón por `TareaPrograma` o `Ruta`, en orden de ventana:

```
MI PROGRAMA DE HOY · mar 21-oct                 Todo enviado · hace 3 min
──────────────────────────────────────────
◆2 P-201B · Correctivo · mecánica
   Cambiar rodamientos · orden 40012061
   Repuesto reservado ✓ · no arrancar
   [ Empezar ]
──────────────────────────────────────────
   P-201A · Preventivo · lubricación   08:00–10:00
   Cambio de aceite · cada 90 d
   [ Empezar ]
──────────────────────────────────────────
   RUTA DE VIBRACIÓN · Bombas La Ceiba      12 puntos
   Vence hoy · el vigía avisa en P-201C (rodamiento lado acople)
   [ Empezar la ruta ]
──────────────────────────────────────────
   CAMPAÑA DE TERMOGRAFÍA · Subestación SE-2   18 puntos · hasta el 24-oct
   Contratista: (si aplica)
   [ Empezar ]
──────────────────────────────────────────
HECHAS HOY  2   ·   SIN ENVIAR  0
```

- La clase se dice en palabras: Correctivo, Preventivo, Predictivo, Ruta de vibración, Termografía, Análisis de aceite (`ClaseTrabajo`, `Tecnica`), junto con la disciplina (`Disciplina`).
- **Sin señal**, la línea de arriba cambia a «Sin señal · 3 cosas guardadas en el teléfono: se envían solas». Todo el programa del día se descarga al abrir con señal, y la app funciona 48 h sin red (`13-ux` D.5: si no, el argumento se cae en la primera demo de campo).
- Nada de rankings ni de comparaciones con otros técnicos (R3 §4.2; P1 §2.8).

### 8.2 Cerrar una orden con fotos y mediciones (`CierreOrden`)

Una pregunta por pantalla, botones grandes abajo. Las horas se marcan con botones y nunca se escriben:

| # | Pantalla | Botones o entrada | Llena |
|---|---|---|---|
| 1 | «Empezar» (al llegar al equipo) | **Empecé** | `inicioTrabajo` (t3), con la hora del teléfono |
| 2 | «¿Qué encontró?» | Las partes del catálogo, con las pistas del vigía y de la historia, como en Identificar | `parte` |
| 3 | «¿Cómo estaba?» | Los modos en palabras de campo (`MODO_EN_CAMPO`) | `modo`, `descriptor` |
| 4 | «¿Qué hizo?» | Cambié · Reparé · Ajusté · Inspeccioné · Limpié · Lubriqué | `actividad` (`ActividadMant`) |
| 5 | «Repuestos» | La lista de reservados, ya marcada; «Usé otro»; «Esperé un repuesto desde…» | `repuestos`, `esperaRepuestoDesde` |
| 6 | «¿Quiénes trabajaron y cuánto?» | Él ya marcado; la cuadrilla del programa con +/− de media hora | `personas` (horas-hombre, que no es lo mismo que la duración, R3 §1.4-c) |
| 7 | «Medición de arranque» (solo si la tarea lo pide) | Número grande con su unidad y la barra con los límites firmados | `Lectura` |
| 8 | «Fotos» | **Tomar foto**. Al menos 1 en los correctivos | `fotos` |
| 9 | «¿Cómo queda el equipo?» | Operativo · Con restricción · No arrancar | `entrega` |
| 10 | «¿Quién recibe?» | La lista de operación del turno, con un toque | `recibe` |
| 11 | «Terminar» | **Terminé** | `finTrabajo` (t4), `origenTrabajo` (sale solo: falla, rutina, ruta o vigía) |

- **Toques**: en un preventivo sin novedad son 5 (Empecé · Inspeccioné · confirmar repuestos · Operativo · Terminé), porque las pantallas 2, 3, 7 y 8 se saltan si la tarea no las pide. En un correctivo son unos 10 a 12. Es más largo que el papel, pero se hace **durante** el trabajo y no al final de la semana. La métrica que lo prueba es T9 (retraso del cierre), antes y después (R3 §5.1; P1 §2.8).
- **Corregir una hora** («se me olvidó tocar Empecé»): se puede, con un motivo obligatorio («olvido», «sin teléfono»). La hora corregida queda con su marca. Así L4 no se miente sin que se vea.
- **Si la orden cerró pozos**, el cierre enlaza su `ParadaAnh`. Como la tarea tenía `pareja` `P_*`, la parada queda `planeada` con el número de orden en `desc_evid` (P1 §2.8). El técnico no ve nada de la ANH.
- Al terminar: «Listo. Cierre guardado · se envía a SAP como confirmación cuando haya señal». Si SAP lo rechaza, el técnico no tiene que hacer nada: la planeadora ve el rechazo (§8.4).

### 8.3 Rutas y campañas (vibración, termografía, aceite)

Punto por punto. Un `PuntoMedicion` por pantalla:

```
RUTA DE VIBRACIÓN · 5 de 12
P-201C · rodamiento lado acople · horizontal
Instrumento: colector · unidad mm/s
       [        4,1        ]   mm/s
 ├────────────────▲──────┼─────────┤
 normal          4,1   alerta     alarma        (límites firmados por la operadora)
Última: 3,2 (hace 30 d)   ▲ subiendo
 [ Siguiente punto ]   [ No se pudo medir ▾ ]   [ Foto ]
```

- Los límites son **los firmados por la operadora**. TRIM no precarga zonas de norma (R3 §2.7; P1 §2.8). Si no hay límite, la barra dice «sin límite firmado» y no se marca nada.
- **Fuera de límite**: al guardar sale «Quedó sobre la alerta. ¿Proponer un aviso para revisarlo?» con **Sí, proponer aviso** / **No, ya lo reporté**. El aviso lleva la lectura, la foto y la tendencia. El correctivo que salga queda con origen `ruta` (P5 de R3).
- **«No se pudo medir»**: Equipo parado · Sin acceso · Instrumento dañado · Otra. Nunca se deja un hueco sin motivo (pedido P-12).
- **Termografía**: foto infrarroja + temperatura del punto + la de su referencia; TRIM calcula la diferencia. Los criterios de severidad son de la operadora (R3 §5.2, NO VERIFICADO en norma).
- **Aceite**: «Muestra tomada · frasco n.º …». El resultado llega después, del laboratorio, a la línea del equipo.
- **Importar del colector o de la cámara**: el formato depende del fabricante (R3 §5.2, NO VERIFICADO). Esa entrada va en el escritorio de la planeadora, no en el teléfono.
- **Campaña de contratista** (Confipetrol u otro, inv-06 §4): la misma ruta con «Contratista: …». El técnico del contratista entra con su propio acceso de campo.

### 8.4 La planeadora (plan) y el jefe (jefe)

**Planeadora, en escritorio: «Programa de la semana».**

```
PROGRAMA · semana 43 · La Ceiba                congelado lun 06:00 ▸ cambios: 3
             Lun       Mar        Mié       Jue       Vie
Mecánica     P-201B●   P-201A○    ruta vib○  ·         ·        cap. 80 h · 62 h
Eléctrica    SE-2 IR○  ·          ·          VSD-07○   ·        cap. 40 h · 18 h
Instrument.  ·         PT-2013○   ·          ·         ·
Soldadura    ·         ·          línea 4○   ·         ·
● hecha  ○ programada  ✕ no hecha  ↻ reprogramada  ⌁ sin enviar
BACKLOG 3,4 semanas · RUTAS QUE VENCEN 2 · «NO ALCANZA» 1 (ruta trimestral sobre un P-F de 3 semanas)
¿ALCANZA EL REPUESTO? rodamiento P-201C: no, por 9 días   [ver]
```

- Los frentes son la `Disciplina` de P1 §1.12 (mecánica, eléctrica, instrumentación, integridad, soldadura, facilidades), que es lo que nombra Edinson: «los diferentes frentes de mantenimiento… y hasta los mismos equipos de soldadura y de facilidades» (Transcript [22:34]).
- **Congelar el programa** (lunes, a una hora configurable): T3 se mide contra lo congelado y no contra lo que se reescribe después (R3 T3). Los cambios posteriores se cuentan y se ven (pedido P-11).
- **Avance del día en vivo**: hechas, en curso, no hechas y **sin enviar**. Esta última es la que el técnico tiene guardada en el teléfono sin señal. No se marca como «no hecha».
- **Rutas**: la frecuencia propuesta es la mitad del P-F observado más corto de la parte (P1 §2.8). Si la operadora pone una mayor, la ruta sale marcada «no alcanza» con su porqué.
- **Rechazos de SAP**: la planeadora ve «2 cierres que SAP no aceptó» con el motivo, y los corrige sin pedirle nada al técnico.

**Jefe, en Mantenimiento**: cumplimiento de la semana (T3, T4, P4), retraso del cierre antes y después del papel (T9), proactivo/reactivo (T1) y órdenes cerradas sin el dato mínimo (parte, modo, horas). Se ve **por frente y nunca por persona**: medir a cada técnico frente a los demás rompe la confianza y es lo que el producto se comprometió a no hacer (R3 §4.2).

## §9 Colores ISA-101 con lo de Adair

### 9.1 Lo que pidió Adair y lo que dice la norma

Adair (Transcript [33:45]): «Tema moradito con falla de comunicación, rojo con interlock, naranja con amarillo con alarma… basado en la ISA 101». Y pidió que, «cuando abra el software tenga como ese mismo estándar» que los SCADA de alto desempeño.

ISA-101 no publica una paleta: exige que cada sitio tenga su propia guía de estilo, y en las fuentes públicas el color del interlock lo fija esa guía (R4 §5.3; `12-estandar` §A). **NO VERIFICADO contra el texto de la norma**, que es de pago. Lo que sí es regla común (ISA-101 e ISA-18.2) son dos cosas:
- **un color no significa dos cosas**;
- **el color nunca va solo**: siempre va con forma y texto (`12-estandar` B.2; P1 §1.13).

Hoy TRIM choca con Adair en un punto: el rojo es la **prioridad 1 de alarma** (`--p1 #b71c1c`, rombo). Además, se usa para «equipo de alto impacto parado» (`Trabajo.tsx`, `Pozos.tsx:66`; captura `tec-trabajo-telefono.png`: el rombo rojo «1 equipo parado») (R4 §5.1).

### 9.2 Paleta final propuesta (`GuiaEstilo` `'sitio'`)

Esta es mi recomendación. Las 9 condiciones son las de `CondicionVisual` (P1 §1.13) y se resuelven en el orden de P1 §2.9. Una sola condición por equipo a la vez.

| Condición | Color (claro / oscuro) | Forma | Texto que siempre la acompaña | Cambio frente a hoy |
|---|---|---|---|---|
| `normal` | gris `--tinta3` | punto | nada | igual |
| `sin-comunicacion` | **morado** `#8420a3` / `#e1a6ea` (el `--invalido` de hoy) | **círculo punteado** (el `DatoInvalido` de hoy) | «Sin comunicación desde 14:07», y el valor se reemplaza por «---» | igual de color; texto nuevo y separado de «dato inválido» |
| `dato-invalido` | **morado** (el mismo) | **círculo punteado con una raya** | «Dato fuera de rango» o «no corresponde» | nueva forma. Ver la nota de abajo y «Desacuerdos» |
| `interlock` | **rojo** `#b71c1c` / `#ff8a80` (el `--p1` de hoy, que pasa a ser `--interlock`) | **candado** | «Interlock · {primera alarma}», p. ej. «Interlock · baja succión PSL-2011» | **nuevo**: el rojo queda solo para esto |
| `alarma-1` | **naranja** `#bf4000` / `#ffab40` | rombo con «1» | «Alarma» | **deja de ser roja** y toma el naranja |
| `alarma-2` | **naranja** (el mismo) | triángulo con «2» | «Atención» | igual que hoy |
| `alarma-3` | **amarillo** `#f9a825` / `#ffd54f`, con trazo oscuro | cuadrado con «3» | «Aviso» | igual que hoy |
| `diagnostico` | azul `#0d5bb5` / `#90caf9` (el `--p4` de hoy, sin uso) | `circulo-i` (círculo lleno con «i», P1 §1.13) | «El vigía anticipa…» | el azul empieza a usarse (forma nueva: pedido P-5) |
| `medicion-campana` | **gris** | **reloj** | «Medido en campaña · hace 42 d» | **deja de ser morado** (R4 §5.4, punto 3) |

**Decisión que hay que validar con Adair: las prioridades 1 y 2 comparten el naranja.** Adair nombró dos colores para la alarma, naranja y amarillo, y el rojo ya es del interlock. Hay tres prioridades y quedan dos colores, así que algo tiene que compartirse. Propongo compartir el naranja entre 1 y 2, porque es el cambio más pequeño: hoy P2 ya es naranja y P3 ya es amarillo; solo P1 pasa de rojo a naranja. Las dos se distinguen por **forma** (rombo o triángulo), **número** y **palabra**. Así funciona hoy `MarcaPrioridad`, con codificación triple (`Prioridad.tsx`, cabecera).

La alternativa B sería dar a P2 un ámbar propio entre el naranja y el amarillo. **No la recomiendo**: dos tonos tan cercanos no se separan al sol ni para quien ve mal los colores (`12-estandar` A.5: «~8 % de hombres»). Va como pregunta para Adair (§11).

**Nota sobre el morado.** P1 §1.13 pide que «ningún color signifique dos condiciones». Aquí, `sin-comunicacion` y `dato-invalido` comparten el morado a propósito: los dos dicen lo mismo al operador, **«no le crea a este número»**. Ese es el uso histórico del magenta en HPHMI (`12-estandar` E.1: «dato inválido / instrumento en falla / stale data»). La forma y el texto dicen el porqué. Si producto no lo acepta, la salida es dejar `dato-invalido` en gris con «?», no buscar un sexto color (ver «Desacuerdos»). **La excepción no se extiende a nada más**: un paso sin respuesta («falta») y «sin prueba reportada a la ANH» van en gris con contorno discontinuo y la palabra «falta», no en morado (S1 §2.2 c1).

### 9.3 Sin depender solo del color

- **Cada condición tiene forma propia**: punto, círculo punteado, círculo punteado con raya, candado, rombo, triángulo, cuadrado, círculo con «i» y reloj. Impresa en blanco y negro, la pantalla se sigue leyendo (`15-ux` E, punto 18).
- **Texto siempre al lado** en listas y fichas. Solo en los íconos de un esquema puede ir sin texto, y entonces el texto va en el `aria-label` y en el globo.
- **El equipo parado sin interlock** no lleva color de alarma por estar parado. Lleva el relleno oscuro de `--eq-off` (`12-estandar` C.2: gris oscuro = parado) y su prioridad sale del diferido que causa (P1 §2.9). Así, el rombo rojo de «1 equipo parado» de `Trabajo.tsx` pasa a ser:
  - candado rojo «Interlock · …», si lo paró una protección;
  - relleno oscuro y «Parado · 1.665 bbl/d», más la marca de prioridad que le toque, si paró por otra causa.
- **La banda de rechazo del IDP** (§6.3) es una `alarma-1`: rombo naranja y la palabra «Rechazado». No usa el rojo, porque no es un interlock.
- **Nunca parpadea nada**, salvo, si algún día existiera, una alarma no reconocida. TRIM no tiene reconocimiento de alarmas: es analítica de solo lectura (`18-bombas` §6.5).

### 9.4 Qué cambia en `index.css` y en `Prioridad.tsx` (solo descrito, sin tocar código)

**`src/index.css`**
1. **Tokens nuevos**, en claro y en oscuro (`:root` y `:root[data-theme="dark"]`):
   - `--interlock`: los valores actuales de `--p1`, `#b71c1c` / `#ff8a80`;
   - `--interlock-f`: el fondo de la etiqueta, los actuales `--p1-f`;
   - `--sincom`: los valores actuales de `--invalido`;
   - `--campana`: un gris de la rampa `--dato-*`.
2. **`--p1` cambia de valor** en la guía `'sitio'` y toma el naranja de `--p2` (`#bf4000` / `#ffab40`). `--p1-f` toma el de `--p2-f`.
3. **La guía se elige con un atributo**, `:root[data-guia="sitio"]` (y su versión oscura), que redefine solo esos tokens. La guía `'trim'` queda como respaldo mientras se valida, sin el atributo. El valor lo pone la `GuiaEstilo` firmada (`estilo:firmar`, P1 §1.15).
4. **Contraste**: `scripts/verificar-libro.mjs` ya recalcula el contraste WCAG de los tokens (comentario de `index.css`). Hay que sumar `--interlock`, `--sincom` y `--campana` a esa prueba. El naranja como P1 tiene el mismo contraste que hoy tiene como P2. El rojo del interlock tiene el que hoy tiene P1, que ya pasa.
5. **El comentario de cabecera** se vuelve la guía de estilo escrita: la tabla de §9.2. R4 §5.4 punto 4: ISA-101 pide la guía, no colores sueltos en comentarios.

**`src/shared/ui/Prioridad.tsx`**
1. `MarcaPrioridad` no cambia de formas (rombo, triángulo y cuadrado). Su `fill` sigue saliendo de `var(--p${s})`, así que con el token cambiado el rombo P1 sale naranja sin tocar el componente.
2. **Componentes nuevos**:
   - `MarcaInterlock`: candado en `--interlock`, con etiqueta «Interlock · {primera alarma}»;
   - `MarcaSinComunicacion`: el `DatoInvalido` de hoy, con etiqueta «Sin comunicación»;
   - `MarcaDatoInvalido`: círculo punteado con raya;
   - `MarcaCampana`: reloj gris con «hace N d»;
   - `MarcaDiagnostico`: círculo azul con «i».
3. **Un solo punto de entrada**, `MarcaCondicion({ c: CondicionVisual })`, que aplica el orden de P1 §2.9. Así ninguna pantalla decide el color por su cuenta.
4. **`MarcaEstado`**: hoy manda «sin señal» a `DatoInvalido`. Debe mandarlo a `sin-comunicacion`. Las mediciones por campaña (`equipos.ts:247`) deben ir a `medicion-campana` y no a «sin señal».
5. **`NOMBRE_PRIORIDAD`** (`src/shared/lib/prioridad.ts`) no cambia. Se agrega `NOMBRE_CONDICION` con los textos de la tabla de §9.2.

## §10 Bocetos en texto (ASCII)

Las seis pantallas que más cambian, primero en teléfono (unos 38 caracteres de ancho) y después en escritorio. **Todas las cifras son de ejemplo.** Marcas usadas en los bocetos:
- `◆1` rombo naranja de prioridad 1, `▲2` triángulo, `■3` cuadrado;
- `🔒` candado rojo de interlock (en pantalla es un SVG, no un emoji);
- `┄` hueco gris con contorno discontinuo y la palabra «falta» (no es morado: §2.1);
- `[ ]` botón.

Las versiones de escritorio que ya están arriba no se repiten: §5.3 (conversión), §6.2 (cumplimiento regulatorio) y §8.4 (programa de la semana).

### 10.1 Identificar · la cadena de una parada

**Teléfono (oper; el supervisor ve los 6 pasos abiertos)**
```
┌──────────────────────────────────────┐
│ ☰ Identificar        La Ceiba   ⓘ   │
│ POR CONTESTAR · 2                    │
├──────────────────────────────────────┤
│ ▲2 LC-21 · pozo                      │
│ cerró 1-oct 18:20 · hace 19 h        │
│ No arrancar                          │
│                                      │
│ ¿Qué lo paró?                        │
│ [ Se dañó un equipo              ]   │
│ [ Se fue la energía              ]   │
│ [ La planta no recibe / tanques  ]   │
│ [ Era un trabajo programado      ]   │
│ [ Más opciones…                  ]   │
│ [ No sé                          ]   │
│ WhatsApp: pregunta 18:21 → sin resp. │
├──────────────────────────────────────┤
│ ▲2 LC-14 · pozo  · falta confirmar   │
│ ¿Estaba programado?   No             │
│ ¿Se regó algo?        No             │
│ TRIM lo dedujo: código GF 02:10  ⓘ   │
│ ▸ Lo técnico (Dónde, Causa, Detalle) │
│   lo propone TRIM; lo confirma su    │
│   supervisor                         │
│ [  Confirmar lo que contesté     ]   │
│ [  Algo está mal                 ]   │
└──────────────────────────────────────┘
```
Así lo ve el operador. El supervisor ve la misma tarjeta con los 6 pasos abiertos y los botones «Confirmar» y «Corregir un paso» (confirmación por paso, §2.4).

**Escritorio (prod, jefe, conf)**: dos columnas. A la izquierda va la lista agrupada por estado («falta un dato 3 · falta confirmar 9 · completas hoy 14»). A la derecha, la cadena de la parada escogida, con la señal (como la columna «SEÑAL» de hoy) y el hilo de WhatsApp debajo. `j` y `k` pasan de una parada a otra sin cerrar el panel (`13-ux` D.4).
```
IDENTIFICAR · La Ceiba                                         octubre, en curso
┌ FALTA UN DATO 3 ───────────┐┌ LC-21 · pozo · cerró 1-oct 18:20 · 247 bbl ──────────┐
│▲2 LC-21  ¿qué lo paró?     ││ 1 Quién           ┄ falta                            │
│▲2 P-201B ¿qué parte?       ││ 2 Dónde se trabó  Pozo        TRIM lo dedujo: código │
│■3 LC-08  ¿planeada?        ││                               CMD del pozo           │
├ FALTA CONFIRMAR 9 ─────────┤│ 3 Qué pasó        Diferida                           │
│ 7× Mant.·Pozo·Falla ESP    ││ 4 ¿Planeada?      ┄ falta                            │
│ 2× Mant.·Planta·Falla VSD  ││ 5 Causa           ┄ falta                            │
├ REVISAR («algo está mal») 1┤│ 6 Detalle         ┄ falta                            │
│ LC-03 · Jairo Peña 04:31   ││ SEÑAL  POC-LC21 · código CMD · 18:20                 │
└────────────────────────────┘│ [Responder por el operador]  [Pedir a Jairo Peña]    │
                              │ WHATSAPP 18:21 pregunta → 18:50 recordatorio → …     │
                              └──────────────────────────────────────────────────────┘
```

### 10.2 Turno · cierre de hoy para la ANH (sup)

**Teléfono**
```
┌──────────────────────────────────────┐
│ Turno · La Ceiba       21-oct        │
│ CIERRE DE HOY PARA LA ANH            │
│ 14 paradas · 11 completas            │
│ Faltan 3 · el reporte sale 07:00     │
├──────────────────────────────────────┤
│ 7 iguales · TRIM las dedujo          │
│ Mantenimiento · Pozo · Diferida ·    │
│ No planeada · Falla ESP              │
│ LC-02 LC-05 LC-09 … (ver las 7)      │
│ [   Confirmar las 7             ]    │
├──────────────────────────────────────┤
│ 1 falta un dato: LC-21               │
│ [   Responder                   ]    │
├──────────────────────────────────────┤
│ Hoy limita: Planta · agua            │
│ (P-201B fuera, 1 de 3 bombas)        │
│ [ Registrar una pérdida ]            │
└──────────────────────────────────────┘
```

**Escritorio**: lo mismo en una sola fila de grupos (una tarjeta por cadena idéntica, como en P1 §2.1: «agrupada por causa raíz, con un toque por grupo»), más el panel «Pasando ahora» que ya existe en `Turno.tsx`.

### 10.3 Cumplimiento regulatorio (reg), en teléfono

(El escritorio está en §6.2.)
```
┌──────────────────────────────────────┐
│ Cumplimiento · reporte del 20-oct    │
│ DEMO-001 · La Ceiba (demo)           │
│ ◆1 RECHAZADO 07:14                   │
│ Corrija antes de 08:14 · quedan 52m  │
│ Motivo ANH: «cau_niv2 no válido…»    │
├──────────────────────────────────────┤
│ Lo que explica el rechazo            │
│ LC-14: «Falla ESP» no pertenece a    │
│ «No planeada - Instrumentación»      │
│ [ Abrir LC-14 ]  [ Pedir a N. Ortiz ]│
├──────────────────────────────────────┤
│ [ Preparar la corrección 1       ]   │
│ Motivo (obligatorio): [__________]   │
├──────────────────────────────────────┤
│ Mes: ✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓✓◆           │
│ (✓ aceptado · ◆ rechazado)           │
└──────────────────────────────────────┘
```

### 10.4 Resumen del gerente: campo, dónde se trabó, equipos y pérdida (ger)

**Escritorio** (se suma a lo que hoy muestra la captura `ger-resumen-ceiba.png`)
```
RESUMEN DEL ACTIVO · octubre, en curso                     Reporte ANH de ayer: aceptado 06:12
POR CAMPO
 La Ceiba    1.046 bbl  [██████████ Planta 61% ][████ Pozo 31% ][▌Exp 8%]
             Se trabó sobre todo en la planta: el agua no tuvo a dónde ir.
             Equipos: P-201B bomba de reinyección 573 · LC-21 sin identificar 247 · SE-2 energía 118
 Morichal      412 bbl  [████ Pozo 70% ][██ Planta 30%]
             Equipos: MN-07 electrosumergible 210 · …
──────────────────────────────────────────────────────────────────────────────
PÉRDIDA · lo que salió y no se vendió        14 bbl de crudo · 1.240 KPC de gas
 La Ceiba 12 bbl (derrame) · Guacamayo 1.240 KPC (tea)
 Quién: nuestra 12 bbl · terceros o naturaleza 2 bbl                        ⓘ
```

**Teléfono**
```
┌──────────────────────────────────────┐
│ Resumen · octubre                    │
│ 1.458 bbl diferidos                  │
│ LA CEIBA 1.046                       │
│ [██████ Planta ][██ Pozo][Exp]       │
│ P-201B reinyección · 573             │
│ LC-21 sin identificar · 247          │
│ MORICHAL 412                         │
│ [████ Pozo ][██ Planta]              │
│ ──────────────────────────           │
│ PÉRDIDA 14 bbl · 1.240 KPC           │
│ nuestra 12 · terceros 2         ⓘ    │
│ Reporte ANH de ayer: aceptado        │
└──────────────────────────────────────┘
```

### 10.5 Mi trabajo y el cierre de orden (tec), en teléfono

```
┌──────────────────────────────────────┐   ┌──────────────────────────────────────┐
│ Mi trabajo de hoy   Todo enviado     │   │ P-201B · Correctivo · 4 de 11        │
│ PARADOS 1                            │   │ ¿Qué hizo?                           │
│ 🔒 P-201B Interlock · baja succión   │   │                                      │
│    PSL-2011 · no arrancar            │   │ [ Cambié                         ]   │
│ MI PROGRAMA DE HOY 4                 │   │ [ Reparé                         ]   │
│ P-201B Correctivo · mecánica         │   │ [ Ajusté                         ]   │
│   Cambiar rodamientos [Empezar]      │   │ [ Inspeccioné                    ]   │
│ P-201A Preventivo 08–10 [Empezar]    │   │ [ Limpié                         ]   │
│ Ruta vibración · 12 pts [Empezar]    │   │ [ Lubriqué                       ]   │
│ Termografía SE-2 · 18 pts            │   │                                      │
│ HECHAS 2 · SIN ENVIAR 0              │   │ Empecé 07:42 · sin señal: se guarda  │
└──────────────────────────────────────┘   └──────────────────────────────────────┘
```

### 10.6 Confiabilidad modular (conf, jefe)

**Escritorio**
```
CONFIABILIDAD · La Ceiba · oct-2025 a oct-2026     perfil firmado 22-oct · base: en marcha
┌ BOMBAS DE REINYECCIÓN ─────────────┐┌ MULTIFÁSICAS ──────────────────┐┌ ELECTROSUMERGIBLES ─────────┐
│ TIEMPO ENTRE FALLAS                ││ TIEMPO FUERA                   ││ LOGÍSTICA                   │
│ 45,8 d  [══▲════════]              ││ Entre 1,2 y 6,0 d              ││ 9,4 d  [═▲═══]              │
│ entre 25 y 92 d · 8 fallas         ││ 2 fallas: el promedio dice poco││ 22 fallas                   │
│ fuera 2,1 d · activa 6 h · log 1,4 d││ entre fallas — · activa —     ││ entre fallas 1.133 d · …    │
└────────────────────────────────────┘└────────────────────────────────┘└─────────────────────────────┘
TIEMPO FUERA EN 5 TRAMOS (bombas de reinyección)
│Detección│Aprobación│ Movilización y repuesto        │Reparación│Arranque│░sin dato░│
LOS MÁS COSTOSOS · DE QUÉ FALLAN · ¿ACIERTA EL VIGÍA?            (como hoy, con su ⓘ de fórmula)
```
(Cada familia abre con la cifra principal que firmó la operadora: aquí, a modo de ejemplo, una distinta por familia.)

**Teléfono**: una tarjeta por familia, una debajo de otra. La cifra principal arriba; las otras tres en una línea; la barra de 5 tramos se vuelve una lista de 5 renglones con su duración.

## §11 Pruebas con usuarios

Método: pruebas cortas de tareas con un prototipo (los bocetos de §10 en pantallas navegables) y, cuando exista, con el demo. Se mide en silencio y se pregunta al final. **Ningún criterio de éxito de abajo viene de una norma.** Son metas de producto tomadas del estado del arte (`09b` §6), y se marcan así.

### 11.1 Con operadores y técnicos reales (5 a 8 personas, en campo, con el teléfono propio y guantes)

| Tarea | Qué se mide | Meta (de producto) |
|---|---|---|
| T-A: llega una pregunta por WhatsApp de una parada de bomba; contestar qué encontró y confirmar | Toques, segundos, errores | ≤ 3 toques, mediana < 15 s (`09b`; `13-ux` D.5) |
| T-B: confirmar una cadena que TRIM dedujo (ESP, código GF) | ¿Confirma sin leer? ¿Entiende «Dónde se trabó»? | Que sepa explicar con sus palabras qué confirmó |
| T-C: un pozo cerró por la energía; contestar «¿De dónde vino el corte?» | Si distingue «del campo» de «de este pozo» | ≥ 80 % de acierto contra lo que diría su supervisor |
| T-D: registrar una pitera con foto, sin señal | Si lo logra sin ayuda y si entiende «se envía solo» | Lo logra; no lo repite al volver la señal |
| T-E (técnico): cerrar un preventivo y una ruta de vibración de 5 puntos | Tiempo total contra la orden en papel; horas marcadas | Más rápido que el papel o igual, y con t3/t4 reales |

Preguntas concretas para el final:
1. «Cuando dice "Dónde se trabó: Planta", ¿qué entendió?» (se valida la palabra frente a «choke»).
2. «¿Qué haría si ninguna opción de "¿Qué lo paró?" le sirve?» (se busca si usa «No sé» o si inventa).
3. «¿Le da confianza tocar "Confirmar" en algo que no escribió usted? ¿Qué acaba de confirmar?» (riesgo de confirmar sin mirar). **Es criterio de salida** (§11.4).
4. «¿Se dice "pitera" en su campo? ¿Cómo le dicen a una fuga pequeña?» (R2 §4.2: el sentido de «pitera» es NO VERIFICADO).
5. «¿En qué momento del trabajo tocaría "Empecé"? ¿Al salir de la base o al llegar al equipo?» (define L3 frente a L4).
6. «¿Quién de su turno recibe el equipo cuando usted termina?» (valida el paso «¿Quién recibe?»).

### 11.2 Con Edinson (confiabilidad; figura en «Proyectó» de la circular)

Se le muestra: la cadena de §2.1, las preguntas de §2.4, la conversión de §5 y las tarjetas de §7. Preguntas:
1. «¿Vale ante la ANH que TRIM proponga los 6 pasos y una persona los confirme? ¿Y si la persona contesta en otro orden, empezando por "¿qué encontró?", y después confirma la cadena completa en el orden de la circular?» (§2.1, NO VERIFICADO; R1 A-13/A-14).
2. «Las preguntas "¿De dónde vino el corte?", con "del campo: pórtico o red de media" frente a "de este pozo: su transformador o su variador", ¿llevan bien a Planta o Pozo como usted lo explicó?» (Transcript [26:48]).
3. «¿Una parada con diferida y además un derrame va como Diferida en `paradas_pozo` y el volumen al balance?» (R2 §4.4; P1 §2.4, provisional).
4. «Una hoja del árbol propio que no dice si fue planeada ("Mantenimiento eléctrico"), ¿la decide el programa firmado?» (§5.3, «Depende de si fue planeada»).
5. «Para el árbol de Ecopetrol, ¿se mapea por el nivel 2 o 3 y se corrigen las excepciones? ¿Qué es el "nivel 6" que mencionó?» (R2 §5.1).
6. «¿Qué cifra principal pondría usted para bombas de reinyección: entre fallas, tiempo fuera, reparación activa o logística? ¿Y por qué?» (§7.1).
7. «¿Le sirven las frases de las bandas ("entre 58 y 1.032 días, 9 de cada 10 veces")? ¿Desde cuántas fallas le creería al promedio?» (los umbrales 5 y 10 son decisión de producto, §7.4).
8. «¿Las 6 marcas de tiempo (aviso, orden liberada, empezó, terminó, arranque) existen en los campos donde ha trabajado, o falta alguna?» (§7.5).
9. «En una parada programada que se pasa de su ventana, ¿el exceso es no planeado?» (§2.5, punto 3; R2 §1.2c).
10. «Dijo que en gas hay "una tolerancia diferente en cuanto a paradas de pozo" [31:08]: ¿es una duración mínima, otra forma de medir el diferido o la nominación? ¿Cambia algo en el reporte ANH o solo en la gestión?» (§3.4).
11. «La cifra de logística (movilización, reparación activa y arranque) llega en F4, febrero de 2027, desde el cierre de la orden en el teléfono; lo que depende de SAP (repuesto, compras) llega en F5. ¿Le sirve ese orden?» (§7.1).

### 11.3 Con Adair (automatización)

Se le muestra la tabla de §9.2 impresa en color y en blanco y negro, y la ficha de una bomba con cada condición. Preguntas:
1. «¿El candado rojo para el interlock coincide con lo que ve en los SCADA de alto desempeño de sus clientes? ¿Qué texto lleva al lado: "Interlock", "Enclavado", "Disparo por protección"?»
2. «Con el rojo para el interlock, ¿las prioridades 1 y 2 pueden compartir el naranja y distinguirse por forma y número, o en su experiencia la alarma 1 necesita su propio color?» (§9.2, decisión a validar; alternativa B).
3. «¿"Sin comunicación" y "dato fuera de rango" pueden ser los dos morados, con forma distinta?» (§9.2, nota; desacuerdo con P1).
4. «¿Qué señal del PLC de una multifásica o una bomba de inyección dice que paró por protección: el first-out, un bit de disparo del SIS, otra?» (P1 §2.9 usa first-out y el lazo `sis`).
5. «¿Una medición de termografía de hace 40 días se debe ver gris con la fecha, o se espera otro estado?» (§9.2, `medicion-campana`).
6. Prueba de 5 segundos: se le muestra la pantalla de Bombas y se le pregunta «¿qué está mal aquí?». Se mide si lo encuentra sin buscar (`12-estandar` D; `15-ux` E).
7. «¿Para cuándo tendría los datos de entrenamiento del equipo piloto, y de qué equipo: multifásica o de inyección?» (Adair [33:45]: «no me la han conseguido»; S1 U1-12 y C-7: el equipo piloto del vigía no es lo mismo que la operadora piloto del reporte ANH).

### 11.4 Criterio para pasar a construir

- Ninguna de las tareas T-A a T-E falla en más de 1 de cada 5 personas.
- **Confirmación de un toque**: si más de 1 de cada 5 personas confirma sin poder decir qué confirmó (pregunta 3 de §11.1), no se construye la confirmación de un toque. Se pasa a confirmar paso por paso (S1 U1-12; riesgo R-E de S1).
- Edinson valida las preguntas 1 a 3 de §11.2. Las que dependan de la ANH quedan como provisionales, con su configuración, como ya prevé P1.
- Adair valida la paleta o propone la suya. Va a la `GuiaEstilo` `'sitio'`, que es configuración firmada y no código.

## Pedidos a producto

Estado de cada pedido tras leer «Respuestas a UX» y «Cambios al vocabulario» de P1 (21-oct, 12:15 y 12:30) y `S1-revision.md` §2.3. Se usan los nombres de P1.

| # | Pedido | Estado según P1 | Nombre en P1 / qué falta |
|---|---|---|---|
| P-1 | Encender `reg`, `plan` y la pantalla Regulatorio | **Parcial** | `reg` y Regulatorio en F1. `plan` en F4 (no antes del 1-dic). `cont` en F3. U1 §1.1 ya lo dice así |
| P-2 | Marca «para revisar» | Aceptado | `ParadaAnh.revision` |
| P-3 | Volumen opcional en campo, con rango y `donde` | Aceptado | `EventoPerdida.volumen: number \| null`, `rangoEstimado: 'menos-1' \| '1-10' \| '10-100' \| 'mas-100' \| 'no-se'`, `donde`; `confirmada` exige volumen y método |
| P-4 | Texto de la pregunta de un destino `precisar` | Aceptado | `{ pregunta, opciones: Array<{ pareja, texto }> }` |
| P-5 | Formas para `diagnostico` y `dato-invalido` | Aceptado | `circulo-i` y `circulo-punteado-raya` |
| P-6 | Plantilla de WhatsApp del cierre | **Cerrado** | Antes del 1-dic (F2): aviso de las 05:00 en pantalla y por correo, sin WhatsApp. La plantilla de WhatsApp (22:00 y 05:00, hora configurable por campo) pasa a F3 y depende de la aprobación de Meta (P1 §6; S1 §5.3) |
| P-7 | Preguntas de campo como datos versionados | Aceptado | `PREGUNTAS_CAMPO@n`. Ahora incluye los seguimientos nuevos de §2.4: tanque de crudo, «¿Qué se afectó?» |
| P-8 | Nodos del árbol propio como botones de la Pregunta 1 | Aceptado en F3 | — |
| P-9 | `hora` = la del toque | Aceptado | `DatoClasificado.hora` y `recibido` |
| P-10 | Guardar el grupo de una confirmación en lote | Aceptado | `ConfirmacionLote`, `DatoClasificado.lote` |
| P-11 | Programa congelado | Aceptado | `ProgramaSemana` |
| P-12 | Motivo cuando una lectura no tiene valor | Aceptado | `Lectura.motivoSinValor` |
| P-13 | Hora corregida en el cierre | Aceptado | `CierreOrden.correcciones` |
| P-14 | Notificación de 24 h del derrame | Aceptado | `EventoPerdida.notificacion24h` |
| P-15 | Umbrales fijos de las bandas | Aceptado | Lista de lo no configurable en P1 §1.11 |
| P-16 | Guía `'sitio'` por defecto | **Cerrado** | Interlock rojo con candado y prioridad 1 naranja **en las dos guías**, desde F3 (P1 cambio P1-7). Hasta F3 rige la paleta de hoy: la banda de rechazo del IDP en F2 saldrá roja (S1 §2.2 c3) |
| P-17 | **Nuevo.** Permiso de comentario para `conf` en la tabla de conversión | **Cerrado** | `anh:comentar` para conf y reg (P1 §1.15) |
| P-18 | **Nuevo.** Tolerancia de gas solo de gestión: «duración mínima para preguntar», por campo, firmada; nunca filtra el reporte | **En espera** | P1 §2.5 declara el alcance «solo crudo»: no se ofrece la diferida ANH a un campo de gas hasta la respuesta a la pregunta 28 (P1 §8; R-23) |
| P-19 | **Nuevo.** Confirmación **por paso** según la capacidad (cambio P1-6 de S1), con dos textos de botón: «Confirmar» (sup, prod, jefe, conf) y «Confirmar lo que contesté» (oper, tec) | **Cerrado** | P1 §1.3 `PASOS_QUE_CONFIRMA`; U1 §2.4, §2.6, §10.1 |

## Desacuerdos con otros agentes

1. **P1 §1.13 y «Respuestas a UX» (morado compartido).**
   - P1 aceptó que `sin-comunicacion` y `dato-invalido` compartan el morado. Coincido con S1 en que la excepción **no se extiende**: «falta» ya no es morado (§2.1, §10.1).
   - Desacuerdo con P1 §2.5, que pinta «sin prueba reportada a la ANH» en magenta. Es un dato que no existe y no un dato malo: debería ir como «falta» (gris, discontinuo), igual que un eslabón sin respuesta (S1 P1-7 a).
2. **[Resuelto 21-oct: P1 cambio P1-7 lo aplicó en las dos guías.]** **P1 §2.9, la guía `'trim'`.** Pedía que `interlock` sea rojo con candado y `alarma-1` naranja **en las dos guías** (S1 §2.2 c2 está de acuerdo). Si no, en una operadora con la guía `'trim'` el rojo significa dos cosas o el interlock queda sin color.
3. **P1 §6 F1, prueba e2e «el operador nunca ve choke ni N1».** Con la confirmación por paso, lo correcto es «al operador nunca se le pide escoger ni confirmar choke, N1 ni N2». Puede verlos, plegados y rotulados como propuesta de TRIM (§2.4, §10.1). Coincide con el cambio P1-6 de S1.
4. **[Resuelto 21-oct: P1 adelantó L3-L5 a F4, cambio P1-8.]** **P1 §6 (logística en F5) frente a §1.11 (`cifraPrincipal` con L3 y L4).** U1 §7.1 lo muestra como «desde mayo de 2027». Pido a P1 que adelante L3 a L5 a F4 desde el cierre en el teléfono, porque es el pedido literal de Edinson [22:34] (S1 C-1).
5. **R2 §4.1, tal como lo recogí antes** («decide si paga regalía»). Retirado: la circular dice «podrá estar sujeta a gravamen» (C24 p.4). Lo de regalías queda como inferencia de R2, marcada así en §1.1 y §4.3.

(Se retiraron dos puntos que quedaron viejos: la inconsistencia de `EnvioIdp.nodos`, que P1 ya corrigió, y la afirmación de que el transcript no tenía marcas de tiempo, que era falsa. Ahora todo se cita por [mm:ss].)

## Fuentes

**Primarias**
- Circular ANH 0024 del 09-09-2026, pp. 2–9 (vía R1 §1, transcripción literal).
- `docs/reuniones/2026-10-19-edinson-adair/transcript.txt`, intervenciones [22:34], [26:48], [31:08], [33:45] y [36:51] (leídas en esta sesión; cada intervención empieza con su marca [mm:ss]).
- Código, solo lectura:
  - `src/pages/Causa.tsx`;
  - `src/entities/mensajes.ts`, `src/entities/roles.ts`;
  - `src/shared/config/producto.ts`;
  - `src/index.css` (tokens de estado, líneas 70–113);
  - `src/shared/ui/Prioridad.tsx`, `src/shared/lib/prioridad.ts`;
  - títulos de panel de `Regulatorio.tsx`, `Resumen.tsx`, `Confiabilidad.tsx`, `Mantenimiento.tsx`, `Trabajo.tsx`, `Configuracion.tsx`, `Turno.tsx` y `widgets/resumen/*`.
- Capturas: `docs/backend/img/oper-causa.png`, `oper-causa-chat.png`, `ger-resumen-ceiba.png`, `tec-trabajo-telefono.png`.

**Ronda 1 y producto**
- `investigacion/R1-normativa-anh.md`, `R2-choke-y-perdidas.md`, `R3-metricas-confiabilidad.md`, `R4-auditoria-producto.md` (leídos completos).
- `P1-producto.md`: §1 completo, §2, §3, §4.1, «Respuestas a UX», «Cambios al vocabulario», y el contenido de §5 y §6 por búsqueda (leído el 21-oct).
- `S1-revision.md` (revisión adversarial): §2.2, §2.3, §2.4, §3 y §7 (cambios obligatorios U1-1 a U1-12).

**Investigación previa de UX** (`~/Downloads/TRIM-hidrocarburos/3-investigacion/`)
- `09b-captura-causa-parada.md` (1 toque, 15 s, catálogo de 5–6 × 3–5, WhatsApp solo de salida en la industria).
- `12-estandar-hmi-industrial.md` (paleta, forma + texto, 9 estados de un rotativo con «Interlock (no permisivo)»).
- `13-ux-flujos-interaccion.md` (lente frente a permiso, niveles de apertura, móvil de campo, microcopia, procedencia).
- `15-ux-industria-unidades-servicios.md` (KPC, tasa frente a volumen, vocabulario de campo).
- `18-bombas-multifasicas-inyeccion-isa101.md` (alcance de ISA-101 en TRIM).
- `06-roles-organizacion-compra.md` (roles y latencia; contratistas).

**NO VERIFICADO en este documento** (consolidado)
- Que la ANH acepte una clasificación propuesta y confirmada, la captura en otro orden o el origen `C` (§2.1, §6.2).
- Cómo reportar diferida y pérdida en la misma parada (§2.5).
- El sentido de «pitera» (§4.2).
- Dónde va el venteo (§4.2).
- Que la ANH espere el crudo en el agua de disposición como pérdida (§4.2).
- La regla de las paradas abiertas al corte (§6.1).
- Si la Res. 0592 cambia el 1-dic (§6.4).
- Que ISA-101 fije los colores de Adair (§9.1).

Todas estas preguntas ya están en R1, R2 o P1 §8.
