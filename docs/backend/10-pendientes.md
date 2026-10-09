# 10. Lo que falta decidir, lo que el demo simplifica y los defectos encontrados

Documentar cada número obligó a correr el motor caso por caso, y eso dejó a la vista decisiones que el código no toma, atajos del demo que un servidor real no puede copiar y algunos defectos. Este capítulo los junta en un solo lugar. Cada punto remite a la sección de «Huecos y dudas» del capítulo donde está explicado con su archivo y línea (por ejemplo, «5B·H10» es el punto 10 de los huecos del capítulo 5B; «6A·H3», el punto 3 de los huecos de las pantallas 6A).

> **Estado al 8 de octubre de 2026.** El dueño del producto decidió D1, D3 y D23, y se corrigieron los defectos marcados ✅ (commit `cb8cd39`: motor, contrato, referencia y pantallas; `verificar-libro` pasó de 284 a 320 comprobaciones). Lo demás sigue abierto. Las fichas del capítulo 5 y las pantallas del 6 ya describen el comportamiento corregido.

**Cómo usarlo.**
- 10.1 son **preguntas para el dueño del producto**: el backend no las puede adivinar.
- 10.2 es lo que el **servidor tiene que hacer distinto** al demo.
- 10.3 son **defectos del front o del motor** que conviene corregir antes de conectar el backend. Si no se corrigen, un backend que reproduzca el motor los reproduce también.
- 10.4 a 10.6 son endpoints, casos de prueba y datos que faltan.

## 10.1 Decisiones abiertas (para el dueño del producto)

| # | Decisión | Opciones | Qué hace hoy el motor | Dónde |
|---|---|---|---|---|
| D1 | ✅ **Resuelto (8-oct):** lo resolvió el desarrollador del backend. **Fuente de datos del borde** | Gateway Sparkplug B leyendo el PLC, o lectura del historiador PI del cliente | El simulador recibe nacimientos Sparkplug por HTTP | 4 |
| D2 | **Eventos de un pozo que se pisan** | Normalizar (cada hora se cobra una vez) o rechazarlos en la ingesta | Normaliza (`intervalosEfectivos`) | 5A·H21, anexo A |
| D3 | ✅ **Decidido (8-oct):** «si falla hoy», descontando el colchón del tanque: crudo que se pierde hoy × promedio de las horas de cada falla de su historia que pasan del colchón (5B, «Costo por falla»). Lo que ya le costó queda como «le ha costado por falla». **Costo por falla** | El de la historia (bbl por falla cerrada) o el de hoy (crudo en riesgo × horas fuera promedio ÷ 24) | Bombas: historia. Electrosumergibles: el de hoy. **Y las dos cifras se suman** en la cabecera de Riesgo | 5B·H10, H28 |
| D4 | **¿El estado «aviso» (P3) pone una parte «fuera»?** | Sí, con prioridad 3 / No | La salud por parte no; el panel de operación sí: la misma variable sale «fuera de banda» en operación con la parte «estable» | 5C·H4 |
| D5 | **¿El vigía predice multifásicas?** | Sí / No, en las tres listas (vigentes, histórico, fallas vistas) | Las vigentes no; el histórico y las fallas sí | 5C·H10 |
| D6 | **Cuándo una predicción es «la misma»** y qué pasa si la parte deja de avisar | Ventana abierta por (equipo, parte); se actualiza o se cierra y abre otra | No está definido (el demo inventa la emisión) | 5C·H11 |
| D7 | **Qué cuenta como intervención** para calificar al vigía | Solo PM03, también PM02/PM01; la misma parte o todo el equipo | Cualquier orden sobre el equipo | 5C·H12 |
| D8 | **Cómo se resume una serie al paso** (`pasoH`) | Promedio, último valor o mediana por intervalo | No definido (recomendado: promedio, `null` si el intervalo no tiene lecturas, paso 1 h para el vigía) | 5C·H13 |
| D9 | **Disparo de 24 h exactas** | Disparo o falla | Falla (`< 24` estricto) | 5B·H29 |
| D10 | **Ventanas de causa** (cascada de 15 min; servicio–bomba ±15 min) | Constantes del producto o configurables por campo | Constantes | 5B·H30 |
| D11 | **El gas en el libro** | Un libro de gas para los campos de gas, o solo condensado | Solo crudo/condensado (La Zarza va por su condensado) | 5A·H2 |
| D12 | **Prueba vigente antes de la primera prueba de un pozo** | «Sin prueba» (hueco de custodia) o la primera prueba hacia atrás | La primera prueba rige hacia atrás sin decirlo | 5A·H3 |
| D13 | **Folio de los informes** | Consecutivo por año (`INF-2027-0001`) o global | Global con el año delante (el primero de 2027 sería `INF-2027-0004`). El contrato dice «por año» | 5D·H15 |
| D14 | **Cambios de planta con motivo** | Exigir motivo y versión base como en las demás escrituras | Sin motivo ni versión | 5D·H28 |
| D15 | **Motivo de una parada programada que ya empezó** | Editable o inmutable | Editable (el resto de la parada no) | 5D·H5 |
| D16 | **Cambios de nombre o correo de un usuario** | Rechazarlos en el `PATCH` o registrarlos en el historial | Se guardan **sin rastro** | 5D·H10 |
| D17 | **Paso de invitado a activo** | Lo hace el servicio de identidad en la primera entrada | No hay regla ni endpoint | 5D·H13 |
| D18 | **Código HTTP de «no hay cambios que firmar»** y orden de las reglas de la firma | Recomendado: 422 `sin-cambios`, en el orden de 5D.2 | El demo lo revisa antes de las capacidades | 5D·H6 |
| D19 | **Verificación pública de un folio que no existe** | `404` o `{ coincide: false }` | No definido | 5D·H18 |
| D20 | **Mínimo de fallas para el MTBF de la flota** | 1 o 2 (alinear con el texto «dos fallas o más») | Equipo: 2; flota: 1 | 5C·H9 |
| D21 | **«Fuera» en el cotejo de la asignación oficial por pozo** | Usar la banda regulatoria del campo por pozo (decisión de producto) u otro umbral | Banda del campo por pozo | 5A·H18 |
| D22 | **El reloj de los datos** | `generadoEn`/`datosHasta` en cada respuesta, o `GET /api/reloj` | `AHORA` fijo del demo | 2.6, 5D·H2 |
| D23 | ✅ **Decidido (8-oct):** el gerente no ve Bombas ni Electrosumergibles (se quitó su variante). Ve de qué campo viene el diferido y, al desplegar el campo, qué equipos fallaron (6A, Resumen). **¿El gerente ve Bombas y Electrosumergibles?** | Darle las pantallas (y probarlas) o quitar el código de su variante | La placa directiva y la variante de decisión existen pero ninguna ruta las alcanza | 6B·H4 |
| D24 | **Un enlace a un campo que la persona no tiene** | Avisar «<campo> no está entre sus campos» | Se reescribe en silencio al campo vigente, y si el equipo existe ahí, abre otro equipo con el mismo nombre | 6B·H15, 6C·H16 |
| D25 | **¿Confiabilidad usa el período de la cabecera?** | Sí / No (y decirlo) | No: toda la historia, aunque la cabecera muestre un período | 6C·H22 |
| D26 | **Dónde se agrega un elemento nuevo del esquema de planta** y quién pone su id | Posición declarada en el cambio; id del servidor | Al final del tren, con un id `Date.now()` del navegador | 6C·H17, H18 |

## 10.2 Lo que el servidor tiene que hacer distinto al demo

| # | En el demo | En producción | Dónde |
|---|---|---|---|
| S1 | El «ahora» es fijo: 2-oct-2026 14:00 | Lo da el servidor (D22); los períodos se mueven solos (`calendarioDe(ahora)`) | 2.6 |
| S2 | El nivel del tanque es una constante (`NIVEL_AHORA`) | Se lee del transmisor de nivel con su hora; sin lectura no se calcula el colchón | 5B·H1 |
| S3 | El perfil de cada bomba (papel, capacidad, clúster, fracción sin bomba, primeras alarmas) está en el código | Fuente versionada: registro de ingeniería o configuración firmada | 5B·H2 |
| S4 | **La firma de señales al parar nunca llega** (0 de 36 paradas) | El servidor decide la firma con las lecturas del instante previo al paro y **la guarda con el evento**. Sin eso, toda parada sin primera alarma queda «sin identificar» | 5B·H3 |
| S5 | La mediana del caudal de la bomba es sobre una serie diaria de 12 puntos | Fijar la ventana (p. ej. los últimos N días en marcha) y la cadencia | 5B·H4 |
| S6 | El MTBF cuenta desde el primer mes con fiscal para todos | Contar desde la puesta en servicio del equipo o su último reemplazo | 5B·H5 |
| S7 | La base maestra de alarmas es una constante por máquina (solo P-201B y MPP-301) | Tabla por máquina y tag, con fuente, firma y versión | 5C·H15 |
| S8 | Los ajustes de protección del variador de cada electrosumergible se generan del pozo | Llegan del variador por un endpoint que **todavía no existe** (10.4) | 5C·H14 |
| S9 | La historia de SAP se deriva del PLC; la reparación activa es ≤ 8 h por construcción | Se lee de SAP (órdenes, confirmaciones, repuestos). No usar los promedios del demo como referencia | 5D·H27 |
| S10 | El registro de WhatsApp se **recalcula** desde la historia | El servidor **dispara** cada mensaje en su momento (con tareas para el recordatorio a los 30 min y el escalamiento a las 2 h), lo guarda con el id de Meta (`wamid`) y no lo reescribe | 5D·H21, H22 |
| S11 | El registro de aciertos del vigía se arma con una regla fija sobre la historia | Cada predicción **se guarda al emitirse** y se califica al vencer | 5C·H26 |
| S12 | ✅ **Resuelto (8-oct).** El colchón de una parada vieja se recalcula con la configuración de hoy | Usar la versión que regía al inicio de la parada (`configEn`), como ya hacen los mensajes | 5D·H4 |
| S13 | ✅ **Resuelto (8-oct):** `fin: null` usa el «ahora». Todos los servicios del demo están cerrados | Un servicio todavía caído (`fin` vacío) usa el «ahora» como fin; hoy su cascada no funciona | 5B·H8 |
| S14 | Un respaldo no declarado se toma como 0 y la predicción dice «se cierra todo el campo» | Tratarlo como hueco de configuración explícito (sin orden de cierre, con su supuesto) | 5B·H12 |
| S15 | `por` es un texto («Nombre · rol») | `{ id, nombre, rol }` salido del token | 5D·H14 |
| S16 | Las respuestas históricas de los insumos no traen `canal` ni `porId` | El servidor siempre los pone | 5D·H23 |
| S17 | El simulador no revisa el campo asignado al asociar o inscribir, y mide el límite de 2 MB en caracteres | Token, campo asignado, bytes; código de inscripción sin sesgo | 5D·H32 |
| S18 | La severidad, el estado y la lectura de cada equipo del catálogo están escritos a mano en los datos del demo | Se **derivan** con una regla (propuesta: parada abierta de alto impacto con pozos cerrados → 1; parada sin costo o de otro equipo → 2; si no, la peor parte; en un servicio, el peor dispositivo). Hoy MPP-301 sale P3 en Superficie y P2 en Riesgo | 6B·H1, 6C·H7 |
| S19 | El límite de cada dispositivo viaja como texto («18.000 – 20.400», «< 3,9») y el front lo vuelve a leer para dibujar la banda | Mandar además la banda numérica (`normal: [a, b]`, `null` del lado abierto), como ya hace `Senal` | 6B·H2 |
| S20 | El estado de SAP y WhatsApp en Conectores («conectado», «sincronizado», el número, «webhook activo») son constantes del front | Un endpoint `GET /api/integraciones` con el estado real | 6A·H10 |
| S21 | «Antes → con TRIM» y «mantenimiento proactivo» usan una fecha de puesta en marcha fija del front | El servidor expone la fecha de puesta en marcha de cada campo | 6A·H12 |
| S22 | Respuestas, análisis y cambios de planta viven en la sesión del navegador (se pierden al recargar) | Los guarda el servidor (capítulo 3) | 6C·H12 |
| S23 | El CSV de un informe lo arma el navegador con un libro que vuelve a pedir | Si el CSV es evidencia, lo arma el servidor junto con el folio (D19) | 6C·H23, 5D·H17 |

## 10.3 Defectos encontrados en el front y el motor

Ordenados de más a menos grave. «Cambia lo que se ve» quiere decir que un usuario ve un número o un texto equivocado.

| # | Defecto | Efecto | Dónde |
|---|---|---|---|
| F1 | ✅ **Resuelto (8-oct).** Una electrosumergible **nunca sale «falló»**: a `saludDeEsp` nadie le pasa la parte de la falla abierta | MN-41 (parada por aislamiento desde el 3-sep) muestra «equipo detenido» en todas sus partes | 5C·H1 |
| F2 | ✅ **Resuelto (8-oct):** una sola definición (D3). El costo por falla se calcula distinto en bombas y en electrosumergibles, y **se suman** | La cabecera de Riesgo («≈ 56.706 bbl si fallan») suma dos cosas distintas | 5B·H10 (D3) |
| F3 | ✅ **Resuelto (8-oct).** Un instrumento de bomba con `valor: null` se descarta del vigía | La regla «sin señal en línea» nunca se dispara | 5C·H2 |
| F4 | ✅ **Resuelto (8-oct).** Con °API sin dato, el mes sale «fuera de ±20 %» en el Cuadre y en el gráfico del factor | El factor está dentro; el motivo real es «banda sin verificar» | 5A·H8 |
| F5 | ✅ **Resuelto (8-oct).** «Publicable» del panel «Por campo» lo calcula el front con otra regla que la de los motivos | Un campo con días sin fiscal sale «Publicable: sí» mientras el sello dice «no publicable» | 5A·H9 |
| F6 | ✅ **Resuelto (8-oct):** `textoHoras`, una regla para todo. El motivo del riesgo dice «262 h» donde la pantalla dice «10,9 d» | Dos formatos para la misma cifra | 5C·H3 |
| F7 | ✅ **Resuelto (8-oct).** El indicador analógico pinta P3 fuera de banda si no le llega estado; el contrato dice P2 | Hoy no se nota (toda señal trae estado) | 5C·H6, 8.6 |
| F8 | ✅ **Resuelto (8-oct).** Evidencia duplicada al heredar la causa de una bomba sin primera alarma | LC-16 y LC-04 traen dos veces «ZS-2011 · marcha → paro · 2 de oct, 03:52» | 5B·H6 |
| F8b | ✅ **Resuelto (8-oct).** `porQueNo` no se hereda: un pozo cerrado por una bomba sin parte queda con `como: 'ninguno'` sin decir por qué | El contrato dice que `porQueNo` acompaña siempre a `como: 'ninguno'` | 5B·H7 |
| F9 | ✅ **Resuelto (8-oct):** es el mismo punto que P1 (`contarPorIdentificar`). Dos cifras de «por identificar» con el mismo rótulo | Turno dice 4 y la cabecera de Identificar dice 2 | 5B·H20 |
| F10 | «Ya fuera» para un servicio que todavía tiene autonomía | «El más cercano: K-101 · ya fuera» cuando quedan 11 min de recibidor | 5B·H19 |
| F11 | La sugerencia de asociación por dígitos propone el equipo equivocado | `XI-1017` (nivel de interfase) se sugiere al compresor de aire K-101; «Aplicar las N» lo deja asociado | 5D·H31 |
| F12 | Las filas del CSV no están protegidas por la huella | Si una causa cambia entre el registro del informe y la descarga, las filas difieren de lo registrado | 5D·H17 |
| F13 | Las horas SAP «del período» cuentan órdenes abiertas por su fecha de liberación | En octubre sale «1 orden» con 0 h | 5D·H24 |
| F14 | El aviso de filas repetidas del plan cuenta como «fila con error» aunque la fila pasa | El mensaje dice que no se pasaron | 5D·H9 |
| F15 | `fechaHoraLarga` no pasa por el formato fijo de fechas | El texto de los documentos cambia con la versión de ICU del navegador | 5D·H1 |
| F16 | El «±%» del encabezado divide por todo el diferido, incluido lo aproximado | Morichal feb-2026 dice ±8,0 % cuando la parte medida va a ±15 % | 5A·H14 |
| F17 | El potencial reciente divide siempre por 30 | Con días sin fiscal, el promedio sale bajo | 5A·H15 |
| F18 | Gramática: «faltan 1 día», «Faltan 1 pozo»; signo menos «−» y «-» mezclados | Texto | 5A·H11, H17 |
| F19 | Varios detalles menores: el dibujo de la tendencia en días y el texto en horas; un interruptor muestra «normal» y no su valor; `MODOS_POR_CLASE` sin usar; dos copias de la tabla estado → prioridad | Texto y mantenimiento | 5C·H19–H25 |

### Defectos de pantalla (capítulo 6)

| # | Defecto | Dónde |
|---|---|---|
| P1 | ✅ **Resuelto (8-oct):** `contarPorIdentificar`. «Por identificar» vale 3 en Mi trabajo, 4 en Turno y 2 en Identificar y Mantenimiento: cada pantalla cuenta distinto (con o sin las que ya arrancaron sin identificar) y la marca ▲ falta en Mantenimiento | 6C·H1, H2, 5B·H20 |
| P2 | ✅ **Resuelto (8-oct):** una regla (`esServicio`, `altoImpacto`). El Resumen llama «servicio» a la multifásica MPP-301 y la franja «Ahora» cuenta como «de alto impacto» a K-101 y MPP-301 | 6A·H1, 6C·H3 |
| P3 | ✅ **Resuelto (8-oct).** Las horas fuera de una misma bomba se escriben «48,7 h» en la placa y «2,0 d» en la ficha; la duración de una misma parada sale 16,0 h (bomba) y 17,2 h (hasta que reabrió el último pozo) sin decir cuál es cuál | 6B·H5, H6 |
| P4 | ✅ **Resuelto (8-oct):** «llega el …». «En SAP · sin stock de…» del gerente cuenta el repuesto que ya viene en camino | 6B·H8 |
| P5 | ✅ **Resuelto (8-oct):** rótulo «Diferido de sus electrosumergibles». «Diferido por sus fallas» de Electrosumergibles suma los disparos, en una pantalla que insiste en que un disparo no es una falla | 6B·H9 |
| P6 | ✅ **Resuelto (8-oct).** La ficha de un servicio en P3 dice «ninguna parte avisa» | 6B·H10 |
| P7 | ✅ **Resuelto (8-oct).** La hora de un evento en el detalle del pozo es la del tramo recortado al período, no la del PLC | 6B·H11 |
| P8 | ✅ **Resuelto (8-oct).** El estado de un dispositivo discreto se muestra con su clave interna («atencion», sin tilde) | 6B·H12 |
| P9 | ✅ **Resuelto (8-oct):** la marca solo en filas de falla. La marca de cada fila del Pareto es la severidad de hoy del equipo, también en filas de parada programada | 6A·H6 |
| P10 | ✅ **Resuelto (8-oct).** El gerente ve la tolerancia («±15,0 % (Res. 40236)») en el globo de la cifra principal | 6A·H3 |
| P11 | ✅ **Resuelto (8-oct).** «Sin base de comparación» se dice en Diferidos y se calla en el Resumen; «Mantenimiento proactivo» desaparece sin decir «sin dato» | 6A·H4, H5 |
| P12 | Horas con tres decimales en la asignación oficial («672,383») se leen como miles y la carga entera se rechaza | 6A·H13 |
| P13 | El plan deja pasar a la firma una meta 30 veces la de hoy después de avisarla | 6A·H14 |
| P14 | ✅ **Resuelto (8-oct):** el tanque solo avisa si de verdad entra agua (`Prediccion.llenado`). El tanque de agua al 89,6 % con su bomba detenida sigue gris hasta el alto-alto | 6C·H20 |
| P15 | Menores: el pie de «En riesgo» se corta a 1.280 px; el gráfico del factor no arranca en el mes en curso; la caja de fecha de la firma sale en el formato del navegador; textos vacíos distintos para lo mismo; «bbl último día» contra «bbl producidos ayer»; la hora del chat simulado no usa el formato fijo | 6A·H2, H7, H9; 6C·H5, H9, H24 |
| P16 | En Planta, el rótulo del caudal queda tapado por los nodos («59.471 bbl/d de flui…»); la misma parte tiene dos nombres según la pantalla; las mismas preguntas salen en dos órdenes; «1 configurados» sin singular | 6C·H26–H29 |
| P17 | Encontrados al documentar los arreglos (8-oct): el gráfico del factor, al arrancar en el mes en curso, deja su eje fuera de la vista a 1.280 px; «Por equipo» del Resumen todavía puede decir «0 %»; el chip «factor · banda ±N %» de Producción no dice que la banda no se pudo verificar; la ⓘ de un servicio sin lectura solo dice «Sin lectura declarada en este campo.»; «bomba parada 3,6 d» se parte en dos renglones en la columna angosta | 6A·H20–H22; 6B·H21, H22 |

## 10.4 Endpoints y piezas que faltan

| Falta | Para qué |
|---|---|
| `GET /api/sesion` y el servicio de identidad (OIDC/SSO) | La persona, su rol, sus campos y sus capacidades salen del token (2.8). En el front: leerla al arrancar y quitar «Cambiar de rol» y las cabeceras `x-rol` y `x-capacidades` del prototipo |
| Endpoint de los ajustes de protección del variador de cada electrosumergible | Banda y alarma de corriente, frecuencia, presión de entrada, temperatura del motor y desbalance |
| `POST /api/webhooks/whatsapp` real y el envío por la Cloud API de Meta con las 10 plantillas aprobadas | Hoy el teléfono del demo hace de webhook dentro del navegador |
| `GET /api/informes/:folio/verificacion` | La comprobación pública de un informe |
| `GET /api/paradas/:evento` con `respuestas[]` y `analisis[]` | La historia de una parada |
| `POST /api/campos/:campo/tags/equipo` por lotes | Asociar tags de a muchos |
| `GET /api/reloj` o `generadoEn`/`datosHasta` | El «ahora» de los datos (D22) |
| Paginación de los tramos del libro | Cuando el portafolio crezca |
| Cliente MQTT contra el broker y canje del código de inscripción por certificado | Hoy el nacimiento entra por HTTP |
| `lectura` como hipertabla de TimescaleDB, particionada por mes | Capítulo 3 |
| `GET /api/integraciones` y la fecha de puesta en marcha por campo | S20, S21 |

## 10.5 Casos que la referencia todavía no cubre

`referencia/` compara 116 casos, pero no tiene:

- el libro, la línea base y el día a día del **mes en curso**, ni un período que corte meses (residuo ≠ 0);
- el **potencial reciente**;
- **informes** (huella), **mensajes** y **relojes**, incluido el caso trampa de redondeo **1,005** (en doble precisión da «1.00»; en decimal exacto, «1.01»);
- las consecuencias de WhatsApp «con respaldo parcial» y «con respaldo total» y la plantilla `trim_recordatorio_arranco`.

Los números de este documento para esos casos salen de correr el motor; conviene convertirlos en casos de `referencia/` antes de que un backend en otro lenguaje los necesite (5A·H20, 5D·H19, H20).

## 10.6 Lo que los datos del demo no muestran

- **Cortes de agua bajos.** El demo tiene cortes de 29 % a 71 % por campo (hasta 79,8 % en un pozo), contra el 92–98 % de los campos colombianos que motivan el producto. Las fórmulas no cambian, pero el demo **subestima el peso del agua y alarga el colchón**. Si el demo se usa para vender, conviene regenerar las pruebas con cortes reales (5A·H1, 5B·H17). **Decidido (8-oct):** se regenera en una segunda tanda, con la planta del demo a escala (bombas, tanques y respaldos para 92–98 % de agua), y con ella la referencia, las capturas y los números de este documento.
- **Incoherencia de La Ceiba.** El agua de las pruebas de sus pozos (21.649 bbl/d) es mayor que la capacidad de P-201B (20.400) y que su caudal medido (19.190): con la bomba en marcha el tanque debería subir, y el demo lo muestra estable (5B·H16).
- **Escenarios que el demo nunca ejercita:** frecuencia reducida explicada por la bomba de reinyección, parada identificada por la firma al parar o por respuesta del operario a una bomba, electrosumergible con dos fallas (su MTBF nunca se calcula), eventos que se pisan, bomba de recobro en riesgo, servicio abierto (5B·H22–H27).
