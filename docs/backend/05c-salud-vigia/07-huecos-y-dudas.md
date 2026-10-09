# 5C.7 · Huecos y dudas

Lo que no se pudo resolver o lo que el código hace de forma inconsistente. Cada punto dice qué pasa
hoy (archivo:línea), por qué importa y qué se recomienda que el backend decida. Ordenados de más a
menos grave. Los puntos marcados **(Resuelto el 8-oct)** se corrigieron en el commit `cb8cd39`; conservan su
número porque el capítulo 10 remite a él.

### A. Inconsistencias que cambian lo que se muestra

1. **La electrosumergible nunca sale «falló».** `saludDeEsp(p, parteFallo?)` acepta la parte de la
   falla abierta, pero ningún llamador se la pasa: `src/shared/api/diferidos.ts:249, 292, 314`,
   `src/entities/equipo-vivo.ts:50`, `src/entities/mensajes.ts:201`, `src/entities/diferido.ts:501`.
   Resultado real: MN-41 (Morichal), parada desde el 3 de sept por aislamiento (código GF), muestra
   todas sus partes «equipo detenido» y nunca «falló»; en las bombas sí se pasa
   (`src/shared/api/equipos.ts:267`). **Recomendación:** el servidor debe pasar `causa.parte` del
   evento abierto del pozo cuando su causa es la propia ESP, igual que en las bombas.
   (Las líneas citadas son de la versión anterior a la corrección, `8700292`.)
   **(Resuelto el 8-oct)** `parteQueFallo(p, ctx)` (`src/entities/esp.ts:141-146`) toma la parte de la
   causa del evento abierto del pozo cuando es su propia electrosumergible, y `saludDeEsp(p, ctx)`
   (`esp.ts:152-161`) **pide el contexto**, así ningún llamador se la puede saltar. MN-41, GU-07 y GU-09
   salen con su aislamiento «falló» (P1) en `/vistas/pozos`, `/vistas/pozos/:campo/:pozo` y
   `/vistas/electrosumergibles`; las 15 cerradas por otro equipo, ninguna (`verificar-libro` §18; 5C.4).

2. **Instrumento de bomba con `valor: null`.** El contrato dice que un instrumento sin señal viaja con
   `valor: null`, pero `senalesDe` descarta todo dispositivo cuyo valor no sea número
   (`src/entities/vigia.ts:141`). Esa variable no queda en `senales` ni en `sinSenal`: la salud la
   toma como discreta (`salud.ts:110-113`) con estado «sin señal», y `BloqueParte` la pinta «sin señal»
   solo porque muestra el estado como texto. El vigía de la bomba nunca llega a la regla «Sin señal en
   línea» (`vigia.ts:151`), que solo se dispara si el PLC manda un número **y** el estado «sin señal».
   **Recomendación:** aceptar `valor: null` como señal numérica sin lectura (`sinSenal`).
   (Las líneas citadas son de la versión anterior a la corrección, `8700292`.)
   **(Resuelto el 8-oct)** `senalesDe` acepta `valor: null` como señal sin lectura (`vigia.ts:144-165`):
   `valor: null`, estado «sin señal», pronóstico «Sin señal en línea: <origen>», y la salud la pone en
   `sinSenal`; un texto sigue siendo discreta. `Dispositivo.valor` es `number | string | null`
   (`tipos.ts:26-29`). Mundo de prueba: VI-2011 de La Ceiba con `null` → «Sin señal en línea: PLC · 47 s»
   (`verificar-libro` §18). El motor además manda `null` (no «—») en todo `/vistas/equipos` (§19).

3. **Texto del riesgo en horas, pantalla en días.** `motivoDeParte` escribe siempre
   `Math.round(h) + " h"` (`src/entities/salud.ts:164`): «… llega a su alarma en 262 h» para MN-27,
   mientras la flota y el detalle dicen «10,9 d» (`fmtHoras`). Igual MPP-301: «124 h» frente a
   «5,2 d». **Recomendación:** usar el mismo `fmtHoras` en el servidor, o que el front no muestre
   `motivo` tal cual.
   (Las líneas citadas son de la versión anterior a la corrección, `8700292`.)
   **(Resuelto el 8-oct)** `motivoDeParte` usa `textoHoras` (`src/entities/salud.ts:166-171`, la regla de
   `fmtHoras`, que ahora la reusa): MN-27 «10,9 d», MPP-301 «5,2 d», GU-04 «2,5 d». `verificar-libro` §18
   compara las dos funciones en 13 valores y falla si alguien cambia una sola.

4. **«Aviso» (prioridad 3) cuenta distinto según quién mira.** Para la salud por parte un instrumento
   en `aviso` **no** es anormal (`enAlarma` solo acepta 1 y 2, `salud.ts:85`), pero el panel FUERA DE
   BANDA de operación y la placa en operación sí lo listan (`src/widgets/pozos/estado.ts:30`,
   `Placa.tsx:27`, `Detalle.tsx` `PartesOperacion`). Una variable en aviso sale «fuera de banda» en
   operación y su parte sigue «estable». **Decidir** si `aviso` pone la parte «fuera» (con prioridad 3).

5. **Prioridad de un interruptor en alarma.** Si la parte está fuera solo por un interruptor
   (`discretaFuera`), su prioridad es 2 aunque el interruptor reporte `alarma` (`salud.ts:138`). El
   contrato dice «fuera, la del instrumento». **Recomendación:** tomar la severidad del interruptor.

6. **Analógico: fuera de banda = 3 si no llega estado.** `Analogico` deduce prioridad 3 para «fuera de
   banda» cuando no recibe estado (`src/shared/ui/Analogico.tsx:49`), mientras el resto del producto
   (ESP `estadoDe`, contrato) dice que fuera de banda sin alarma es **atención (2)**. Hoy no se nota
   porque toda señal trae estado; con un instrumento sin estado, el color cambiaría.
   (Las líneas citadas son de la versión anterior a la corrección, `8700292`.)
   **(Resuelto el 8-oct)** Sin estado, fuera de banda es **atención (2)** (`Analogico.tsx:51`), como el
   contrato y `estadoDe`.

7. **Velocidad «no atribuible» con un motivo falso.** Si las series de descarga y succión de una
   multifásica no están alineadas (distinto `desde`, `pasoH` o largo), `dpEstable` es falso y el motivo
   dice «La presión diferencial cambió más de 5 %…» aunque no se pudo calcular (`vigia.ts:133-136,
   159-160`). **Recomendación:** motivo propio («las series de presión no están alineadas») o pedir
   al historiador las dos con el mismo `desde`/`paso`.

8. **«Detenido» con dos definiciones.** El vigía deja de proyectar con `eq.marcha === 'detenido'`
   (`vigia.ts:126`); la salud considera detenido el equipo con `marcha = 'detenido'` **o** una parada
   abierta en su PLC (`salud.ts:192, 201`). Si el PLC tiene un evento abierto y la marcha no dice
   detenido, el vigía proyectaría y las partes dirían «equipo detenido». En el demo coinciden.
   **Recomendación:** una sola fuente (`marcha` derivada del PLC).

9. **MTBF de la flota con una sola falla.** Por equipo, el MTBF exige ≥ 2 fallas
   (`libro.ts:1264`); por flota, la pantalla lo calcula con $D \cdot N / \sum n_f$ si hay **al menos
   una** (`src/pages/Esp.tsx:71`, `src/pages/Confiabilidad.tsx:50`), y el ⓘ de la flota dice
   «se calcula con dos fallas o más». En Morichal hay 10, así que no se nota. **Decidir** el mínimo de
   la flota y alinear el texto.

10. **Qué predice el vigía: ¿multifásicas sí o no?** Las predicciones vigentes excluyen las multifásicas
    (`altoImpacto = subtipo !== 'multifasica'`, `diferido.ts:581`; filtro en `aciertos.ts:81`), pero el
    registro histórico del demo sí las incluye (`flotaDe` trae MPP-301; `aciertos.ts:134`): Morichal
    tiene una predicción intervenida de MPP-301 · rodamientos y ninguna vigente de MPP-301 aunque su
    filtro cruce en 5,2 d. Las fallas vistas también incluyen MPP-301 (su falla del 24 de sept cuenta
    como «se le escapó»). **Decidir** el alcance y aplicarlo a las tres listas.

### B. Decisiones que el código no toma (el backend tiene que tomarlas)

11. **Identidad de una predicción.** El vigía se recalcula con cada lectura; el código no dice cuándo
    una predicción es «la misma» (mismo equipo y parte con la ventana abierta), si su ventana se
    actualiza o se cierra y se abre otra, ni qué pasa si la parte deja de avisar antes de vencer. En el
    demo la vigente tiene `id = PR-<campo>-<equipo>-<parte>-vigente` y `emitida` inventada
    (`aciertos.ts:83-85`).

12. **Qué cuenta como intervención.** `calificar` cruza la intervención por **equipo**, no por parte
    (`aciertos.ts:73`), y el contrato dice «una orden cerrada en SAP sobre el equipo» sin decir la
    clase. En el demo las intervenciones son solo las PM03 que la propia regla crea. Hay que decidir si
    cuentan PM02 (preventivas del programa), PM01, y si se exige la misma parte (el catálogo B de la
    orden).

13. **Resumen de la serie a `pasoH`.** El contrato dice que el servidor escoge el paso y lo declara,
    pero no qué agregado usa (promedio del intervalo, último valor, mediana). El vigía es sensible a
    eso (un promedio suaviza y baja el error estándar). Recomendado: promedio por intervalo, con `null`
    si el intervalo no tiene lecturas válidas, y un paso de 1 h para el vigía.

14. **Ajustes de protección del variador sin endpoint.** La banda y la alarma de cada señal de la ESP
    no tienen ruta (CONTRATO.md, «Pendiente del lado del servidor»); `referencia/insumos/<campo>/
    electrosumergibles.json` las trae con `endpoint: null`. En el demo se generan en
    `src/entities/esp.ts:56-87`.

15. **Base maestra de alarmas.** En el código es una constante por máquina (`ALARMAS`,
    `src/entities/limites.ts:53-68`) y solo P-201B y MPP-301 la tienen; el backend necesita su tabla
    (por máquina y tag, con fuente y firma) y su versión.

16. **Tag repetido en un campo.** El motor lanza error si dos equipos declaran el mismo tag
    (`limites.ts:87`); la ingesta solo tiene `409 tag-de-otro-gateway` (otro gateway). Falta el caso de
    un mismo gateway que lo declara en dos dispositivos.

### C. Dudas de método

17. **«Cruzado» se decide con el valor ajustado, no con la lectura.** `pronostico` compara el límite
    con $\hat y_{\text{fin}}$ (`vigia.ts:79-80`). Puede pasar que la lectura ya esté en alarma y el
    ajuste no (sale «cruza en N h» muy corto) o al revés (sale «ya cruzó» con el instrumento en
    normal). La parte sigue la peor de las dos (`anormal` = cruzado **o** estado en alarma/atención),
    pero el texto puede contradecir al indicador. Mantener si es deliberado; si no, usar
    $\max(\text{lectura}, \hat y)$ en el sentido del límite.

18. **Mínimo de 4 puntos y sin control de autocorrelación.** El error estándar supone residuos
    independientes; con series horarias muy autocorrelacionadas, $2\,\text{SE}_b$ subestima la
    incertidumbre y el rango sale angosto. Con el paso diario del demo no se nota. Considerar un mínimo
    de puntos mayor o un error estándar robusto (Newey-West) en producción.

### D. Detalles de pantalla

19. El dibujo de la tendencia rotula el cruce en días («en 1,8 d») mientras el texto de al lado lo dice
    en horas («43 h») (`Proyeccion.tsx:66` vs `comun.ts:15-17`).
20. `fmtHoras` corta en `h < 48` antes de redondear: 47,6 h → «48 h»; 48 h → «2,0 d».
21. La fila de un interruptor en `BloqueParte` muestra el estado («normal») y no el valor del
    instrumento («sin fuga») (`src/widgets/bombas/BloqueParte.tsx:28`).
22. El panel VIGÍA lista solo señales con mecanismo (`Detalle.tsx:67`): una variable sin mecanismo pero
    con alarma se proyecta en la salud y no aparece en VIGÍA (no ocurre en el demo).
23. `MODOS_POR_CLASE` (`src/entities/iso14224.ts:37-53`) no lo usa ninguna pantalla: o se borra o se
    usa para validar que el modo de una parte aplica a la clase.
24. La frase «la daña: \<variable\>» (`comun.ts:99`) no aparece en ningún equipo del demo: toda causa
    activa del demo también cruza y la frase que gana es «cruza en …». Para probarla hace falta un caso
    con la variable que daña fuera de banda y sin tendencia.
25. Dos copias de la tabla estado → prioridad: `SEV` en `src/entities/salud.ts:84` y `DE_ESTADO` en
    `src/shared/lib/prioridad.ts:10-12`. Hoy dicen lo mismo.
26. **Los casos de referencia de aciertos son de la regla del demo.** `referencia/aciertos/<campo>.json`
    trae el registro que arma `prediccionesHistoricas` (y la emisión inventada de las vigentes). Un
    backend real, que guarda lo que emite, no lo va a reproducir; para comprobarlo con
    `scripts/referencia.mjs` hay que darle ese registro como insumo (hoy no hay endpoint de escritura ni
    de carga de predicciones) o comprobar solo `calificar` y `fallas[]`.
