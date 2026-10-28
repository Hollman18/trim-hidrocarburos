# El kit SCADA de la v3 (§8)

**27-oct-2026 · M4.** Es el punto 5 de la puerta del dueño (§10).

**La lámina:** `imagenes/lamina-kit-scada.png`, en la dirección Grafito, tema claro. La fuente está en `imagenes/fuente/kit.html`, y el kit, en `imagenes/fuente/kit.js`.

**Cómo se usa en las pantallas:**
- nivel 3 de P-201B: `imagenes/d1-grafito-p201b-escritorio-claro.png` y sus versiones en las otras dos direcciones;
- «Por qué avisa» del jefe;
- «El agua, ahora» del supervisor;
- la tubería de producción.

**Qué es.** Un juego de componentes **propios, en SVG**, que se usa igual en todas partes. Sigue a Hollifield y ASM (X2 §5) con el rigor de las versiones de alto desempeño de AVEVA, Honeywell Experion, Ignition y DeltaV Live:
- retícula;
- grosores consistentes;
- nada decorativo;
- el color solo para el estado.

**Los valores de la lámina son lecturas del demo** (P-201B, K-101, LT-2012 y FI-2011). Los estados que el demo no tiene en ese momento (anormal, sin comunicación) dicen «**ejemplo de estado (no es una lectura)**».

---

## 0. Las reglas de todo el kit

| Regla | Valor |
|---|---|
| Retícula | 4 px. Alturas y separaciones en múltiplos de 4 |
| Trazos | **1 px**: reglas, escalas, rayas de extremo, impulsos de instrumento · **1,5 px**: contorno de equipo, trazas secundarias · **2 px**: contorno anormal, puntero, límite de alarma, línea de proceso, traza principal |
| Color | Solo los tokens: grises de dato (`dato1`, `dato3`, `banda`, `pista`, `tinta*`), equipo (`eq-*`) y estado (`interlock`, `p1`–`p3`, `sincom`). **Nada de colores propios del kit** |
| Letra | Cifras **tabulares**. Valores que deciden a 18 px (14 en un esquema denso); rótulos a 12–14 px; tags en la mono |
| Nunca | Sombra, brillo, degradado, 3D, animación de flujo, parpadeo o caja teñida del color de la alarma |
| Accesible | Cada gráfica lleva `role="img"` y su nombre («Presión de succión, 18,2 psi; normal sobre 10; alarma en 8»). La marca de estado lleva su palabra |

**Los 5 estados**, iguales en cada componente:

| Estado | Qué lo dispara (motor) | Cómo se ve |
|---|---|---|
| **Normal** | En banda, en marcha | Gris y tinta. Sin marca |
| **Anormal** | Una prioridad que llega del motor (`condicion`) | La **marca** a la izquierda del valor, el valor en negrita, el límite cruzado en el color de su prioridad y, en el equipo, contorno de 2 px (y anillo solo para ◆1 y el interlock) |
| **Sin dato** | No hay lectura, o no hay instrumento | Contorno gris discontinuo, sin puntero, «—» y la palabra («sin lectura», «sin instrumento»). Nunca un cero |
| **Sin comunicación** | No llega dato del PLC más allá de la vigencia del tag | Contorno **morado** discontinuo, «---», el círculo punteado y «desde HH:MM». Nunca el último valor como si fuera de ahora |
| **Parado** | El equipo está detenido (supresión por estado, X2 §5.1.8) | Todo en gris, la banda tenue y **ninguna marca propia** en sus variables. La marca la lleva el equipo, una sola vez |

---

## 1. Indicador analógico de barra (`KIT.barra`)

**Anatomía**, de izquierda a derecha:
1. **Escala fija del instrumento:** una pista de 8 px en `pista`. Sale del rango declarado o de los límites firmados (`SenalNivel3.escala`), **nunca de la lectura**. Sus extremos no se rotulan.
2. **Banda normal:** relleno `banda`, con una raya de 1 px en `tinta3` en cada extremo cerrado. Si la banda está abierta («> 10»), llega hasta el borde.
3. **Límite de alarma:** raya de 2 px en `tinta2`, de 18 px de alto. Cuando el valor lo cruza, la raya toma el color de su prioridad.
4. **Disparo (interlock):** raya doble de 1 px. Es distinto de la alarma, como pide Hollifield.
5. **Puntero:** raya de 2 px y cabeza de 8 px, en `tinta` (en `tinta3` si el equipo está parado). **Nunca se pinta.**
6. **Fuera de escala:** el puntero se queda en el borde, con un triángulo «◄» o «►».
7. **Valor** (fuera del SVG, a la derecha): 18 px tabular, con la unidad a 12 px y la marca a su izquierda si es anormal.

**Medidas:**
- alto, 28 px;
- ancho, de 150 a 240 px;
- **el mismo ancho y la misma escala en los equipos gemelos** (P-201A, B y C), para que «todo bien» se vea como una línea recta.

| Estado | En la lámina | Fuente |
|---|---|---|
| Normal | PI-2010, 12,0 psi | Lectura del 22 de sept (`serie[1]`) |
| Anormal | 8,8 psi bajo la alarma de 8: ◆ y negrita | Ejemplo de estado |
| Sin dato | contorno gris discontinuo, «—» | Ejemplo de estado |
| Sin comunicación | contorno morado discontinuo, «---», «desde 14:07» | Ejemplo de estado |
| Parado | PI-2010, 18,2 psi, en gris y sin marca | Lectura de hoy, con P-201B parada |
| **Anormal real** | PT-1011 de K-101: **112 psi**, con banda de 115 a 130 | En el Hoy del jefe (`d1-grafito-jefe-*.png`) |

**Lo que nunca hace:**
- pintar la barra o el número del color del estado;
- mover la escala con la lectura;
- inventar un rango: si no está firmado, dice «escala provisional», y si no hay ningún límite, no se dibuja;
- poner una marca en las variables de un equipo parado.

**Su prueba en el auditor (para construir):**
- I1: el mismo tag con 3 valores deja la banda en la misma x, ±1 px;
- I2: el puntero y el número en `--tinta`;
- I3: la banda con sus dos rayas;
- E3: una sola marca por equipo parado.

## 2. Tendencia (`KIT.tendencia`)

**Anatomía:**
- **la ventana, escrita** en el título («12 d», «Los 12 días antes de parar»);
- el eje x con el primer día y «hoy», que va a la derecha y en negrita;
- el eje y rotulado solo en los extremos de la escala y en los límites;
- la banda normal sombreada (`banda` al 60 %);
- la alarma en discontinuo de 1,2 px (5-3);
- la línea en `dato1` de 2 px;
- el último punto, como un círculo de 2,6 o la marca.

**Escala:** la de su señal (`TendenciaNivel3.escala`). No cambia sola e incluye siempre la banda y los límites.

**Trazas:** hasta 4 por gráfica, separadas **por trazo** y no por color:
- continua (2 px);
- discontinua 6-3;
- punteada 1,5-3;
- guion y punto.

Si hay más, van como gráficas chicas iguales, una debajo de la otra, con el mismo eje de tiempo. Así quedan las 3 de P-201B.

**Medidas:**
- en una placa o una fila, de 110 a 150 × 30 px, sin ejes;
- en la ficha, 300 × 56 px o más;
- en el nivel 1, 240 × 64 px o más.

| Estado | En la lámina |
|---|---|
| Normal | TI-2011, temperatura de cojinete, 12 d (real) |
| Anormal | Cruza la alarma de 85: la raya toma el naranja y la línea sigue en tinta (ejemplo de estado) |
| Sin dato | Un hueco de 3 días corta la línea: nunca se une por encima ni se pinta en cero (ejemplo) |
| Sin comunicación | La línea termina donde se perdió la señal, con el círculo punteado (ejemplo) |
| Parado | PDI-2011 de P-201B (real): el tramo parado va rayado y la línea, en gris |

**Lo que nunca hace:**
- autoescalar;
- colorear las series por categoría;
- dibujar lo proyectado igual que lo medido (lo proyectado va discontinuo y con su palabra).

## 2b. Los gráficos profesionales: ejes, leyenda y ficha (D2, 27-oct)

**El dueño (27-oct):** «gráficos profesionales, tipo Grafana… cuando tú pases el cursor te muestre más detalle». Con la disciplina de ISA-101: gris lo normal; el color, solo en la marca de lo anormal, con su forma y su palabra.

**Ejes y cuadrícula** (`Tendencia`, `Columnas`):
- marcas redondas (1, 2 o 5 por una potencia de 10, `ejes.ts`) dentro de la escala de la señal: **la escala no cambia**, solo se escoge dónde van las marcas;
- la cuadrícula, una raya de 1 px en `--linea2`, **solo donde hay rótulo** (una raya sin su cifra no se lee). Primero se rotulan los límites, después los extremos y al final las marcas; la que pisaría a otra no se escribe;
- rótulos a 12 px, en la mono y tabulares; los límites, en `tinta2`;
- **la unidad en el eje**, arriba a la izquierda del dibujo (desde 70 px de alto; en las de 64 px va en el título);
- el eje x con sus marcas de 4 px y, entre el primero y el último, los rótulos que caben (`etiquetas` o `rotulosX`); con la proyección (`hoy`), solo los extremos;
- en `Columnas`, la cuadrícula con su cifra a la izquierda y **nunca el 0** (el piso ya lo dice).

**La leyenda** (`Tendencia`, con 2 series o más): un botón por serie con su muestra de trazo, su nombre, su último valor y, si lo es, «proyectado» o «simulado». Tocar una la deja sola; otra vez, vuelven todas; con Mayús (o Ctrl), la apaga. La apagada va tachada (no solo en otro tono). Apagar una serie **no mueve la escala**.

**Lo que no se midió:** `SerieKit.proyectado` y `SerieKit.simulado` van discontinuos, sin el punto final y con su palabra en el título, la leyenda y la ficha. `SerieKit.esMeta` marca la meta: la ficha dice si lo medido quedó «bajo la meta por 200» o «sobre la meta por 1.281».

**La ficha** (`Ficha.tsx`; los ganchos, en `cursor.ts`):
- **al pasar el cursor**: la raya vertical de seguimiento (1 px, `tinta2`), el punto de cada serie (anillo de 3,5) y la ficha al lado, sin salirse de la pantalla;
- **en el teléfono**: tocar abre la ficha **arriba de la gráfica** (el dedo no la tapa) y arrastrar de lado la mueve. El desplazamiento vertical sigue siendo de la página (`touch-action: pan-y`). Tocar fuera la cierra;
- **con el teclado**: la gráfica es una parada de Tab. Las flechas recorren los puntos, Inicio y Fin van a los extremos, Re Pág y Av Pág saltan una décima, y Escape la cierra sin cerrar el modal. Lo que dice la ficha **se anuncia** en una región `aria-live`;
- **qué dice**: el cuándo (`etiquetas`, o la fecha que sale de `tiempo: { desde, pasoH }`, con la hora si el paso es de horas). Si no hay ninguna de las dos, «lectura 3 de 12»: **nunca una fecha inventada**. Después, cada serie con su valor y su unidad, y su estado en palabras: «sobre la alarma (85)», «bajo el máximo firmado (800)», «en banda», «sin dato» (nunca 0), «---» y «sin comunicación desde las 14:07», «proyectado», «equipo parado» (solo en el tramo rayado). Al pie, la banda y los límites, «escala provisional» y de dónde sale (`origen`);
- **cómo se ve**: `--elevado` con borde de 1 px en `--linea`, **sin sombra ni color**, letra de 12 px o más y cifras tabulares. Va en `<body>`, así que no la recorta la tarjeta ni el modal (z 210, sobre el modal de 120), y en el papel no sale;
- **en `Barra` y `ContraMeta`**: al pasar el cursor, al tocarla o con Tab, la ficha con el valor y su estado, la banda, la alarma, el disparo y la escala (firmada o provisional). En la barra contra la meta: la meta o el máximo, cuánto falta o cuánto se pasa, y de dónde sale;
- **dentro de una fila que ya es un botón o un enlace** (la de `PorCampo`, la de un tanque en Planta, la del dispositivo en la ficha del gerente), la pieza **no abre otra ficha ni es otra parada de Tab**: la fila responde por ella. Lo dice el DOM al montarse (`useAnidado`). La compacta responde al puntero, pero no es parada de Tab (su barra de al lado sí lo es).

**El modo detalle** (`detalle`, para el modal de D1): 640 × 240 si no se dice el tamaño, a lo ancho de su caja (`ajustar`, medida con `ResizeObserver`), más marcas en los dos ejes, el rango escrito en el título («de 21 de sept a 2 de oct») y el mínimo y el máximo de cada serie en la leyenda. `Columnas` acepta `detalle` (más marcas). Uso: `<Tendencia … detalle />` y listo; con `alto` se cambia el alto.

**Rendimiento:** pasar el cursor no toca el motor ni rehace el dibujo. El dibujo fijo se arma una vez por datos y tamaño (`useMemo`). El índice se calcula en un `requestAnimationFrame`, uno por cuadro aunque lleguen veinte eventos, y el estado solo cambia si cambia el punto. Medido: 300 movimientos sobre los 275 días de Producción, sin ninguna tarea larga.

**Sus pruebas:**
- `verificar-kit` (D2): las marcas redondas, el cuándo de cada punto, la cuadrícula solo con rótulo, la unidad, las paradas de Tab, la leyenda, el detalle, las columnas sin el 0 y la ficha sin sombra, en `<body>` y con `requestAnimationFrame`;
- `e2e/kit-graficos.spec.ts`: el ratón, el teclado y el teléfono sobre el mes a mes, las fallas por mes y la barra de la planta viva. La ficha dice **la misma cifra que la pantalla**, no se sale de la ventana, su letra es de 12 px o más y abrirla no agrega hallazgos del detector.

## 3. Símbolos de proceso (`KIT.bomba`, `tanque`, `valvula`, `separador`, `pozo`, `medidor`, `area`)

Son de ISA-5.1 simplificada, en 2D. **El relleno dice si el equipo corre, por brillo:**
- en marcha, más claro que el fondo (`eq-marcha`);
- parado, más oscuro (`eq-parado`);
- sin dato, sin relleno y con contorno discontinuo.

**La marca dice qué anda mal:** va arriba a la izquierda, fuera del cuerpo, a 14 px.

| Símbolo | Medidas | Anatomía |
|---|---|---|
| Bomba centrífuga | Ø 32 | Círculo con la descarga tangente arriba. No lleva impulsor dibujado: nada gira |
| Tanque | de 40 a 72 de ancho y de 60 a 136 de alto, radio 3 | Techo plano. El nivel, en gris (`banda`), con su línea de 1,5 px en `dato1`. El alto y el alto-alto, como rayas de 2 px en el costado, con su rótulo |
| Válvula | 24 × 14 | Corbatín con el vástago. Abierta, clara; cerrada, oscura |
| Separador | de 100 a 120 × de 36 a 40 | Cápsula con su vertedero |
| Pozo | 24 × 36 | El árbol sobre la raya del suelo |
| Medidor | Ø 40 | La burbuja de ISA-5.1, con las letras arriba (FI, PI, PDI), el lazo abajo y el valor afuera (a la derecha, arriba o abajo, según el espacio), a 14 px en la mono |
| Área de proceso | de 96 a 150 × 40–44, radio 2 | Un tramo (pozos, planta, salida) |

**Los 5 estados en la lámina:**
- en marcha;
- anormal: contorno de 2 px en tinta y anillo de 2 px del color de ◆1;
- sin instrumento: discontinuo gris;
- sin comunicación: discontinuo morado, con su marca;
- parado normal: relleno oscuro y sin marca.

**El medidor** lleva las lecturas reales de FI-2011: 74.200 el 21 de sept, 63.070 el 1 de oct y 0, parada.

**Lo que nunca hace:**
- girar el impulsor o «fluir» la tubería;
- llevar sombra, brillo o 3D;
- teñir el cuerpo;
- poner una marca a un pozo cerrado por otro equipo (la lleva el que lo cerró).

## 4. Una línea por fluido (`KIT.linea`)

Son los trazos que ya usa la app (`pages/Planta.tsx`, `TRAZO`). Todas van en `dato1`, con una flecha fija de 8 px al final:

| Fluido | Trazo |
|---|---|
| Multifásico | 3 px, continuo |
| Crudo | 2,4 px, continuo |
| Gas | 2 px, 8-4 |
| Agua | 2 px, 2-3 (punteado) |
| Eléctrica | 2 px, continuo |
| Aire | 2 px, 6-4 |
| Sin flujo | El mismo trazo, en `dato3` al 55 %, con «SIN FLUJO». En el tren de P-201B, su descarga parada |

**Lo que nunca hace:** distinguir el fluido por el color ni animarlo.

## 5. Marca de estado (`KIT.marca`)

Las formas son las de X2 §4.2, sin cambios, en un cuadro de 14 × 14. Miden como mínimo 12 px en el escritorio y 16 px en el teléfono:

| Marca | Forma | Color |
|---|---|---|
| Interlock | candado | rojo, **solo aquí** |
| Alarma | rombo con «1» | naranja, número claro |
| Atención | triángulo con «2» | amarillo con trazo oscuro de 1 px |
| Aviso | cuadrado con «3» | amarillo con trazo oscuro de 1 px |
| Sin comunicación | círculo punteado | morado |
| Dato inválido | círculo punteado con raya | morado |
| Falta | rectángulo discontinuo | gris |
| Sin instrumento | corchetes | gris |
| No arrancar (bloqueo) | círculo con barra | tinta |
| Normal | punto | gris |

**La palabra va al lado** en listas y fichas. Si no hay espacio (un esquema), va en el nombre accesible.

**«Falta en el motor»** es la misma marca «falta» con esas palabras. La usan las imágenes para lo que M1 marcó así: la pérdida, registrarla y la respuesta de la ANH.

## 6. La cifra (`KIT.cifra`)

**Anatomía:**
- **rótulo** de 2 a 4 palabras, en la condensada, de 13 a 14 px, en mayúsculas;
- **número** tabular:
  - el principal, de 56 a 64 px, peso 650 y −0,035 em;
  - los de apoyo, de 20 a 28 px;
- **unidad** corta, de 15 a 18 px, en `tinta2`;
- **nota** de una línea, con la calidad (medido, calculado, proyectado) y la vigencia;
- **marca** a la izquierda del número si es anormal.

**Las reglas de X2 §5.6:**
- una sola cifra de 32 px o más en la primera vista, y como mucho 4 entre 20 y 31 (T1);
- nunca en color;
- lo proyectado o simulado, nunca más grande ni más arriba que lo medido. En el gerente, el cierre proyectado va a 20 px, con la palabra «proyectado» y una barra de solo contorno.

| Estado | En la lámina |
|---|---|
| Normal | 2.650 bbl/d, ahora, 5 campos (real) |
| Anormal | ■3 · 10.700 bbl/d, bajo la meta de 10.900, en La Ceiba (real: el motor lo marca como aviso) |
| Sin dato | Pérdida: «—», «nada registrado en octubre» (real) |
| Sin comunicación | Caudal FI-2011: «---», «desde 14:07» (ejemplo de estado) |
| Parado | Caudal FI-2011: 0 bbl/d, en gris, P-201B parada (real) |

**La barra contra la meta** (`contraMeta` en `pantallas.js`; X2 §5.2) es el compañero gerencial de la cifra:
- la barra oscura llega hasta el valor, y la meta o el máximo es una raya de 2 px;
- lo proyectado va como solo contorno discontinuo.
- **Cuando se construya, entra al kit como `KIT.contraMeta`.**

---

## 7. Lo que falta para que el kit «se use en todas partes» (§11)

1. **Pasarlo a React** en `src/shared/ui/kit/`, con las mismas firmas: `Barra`, `Tendencia`, `Bomba`, `Tanque`, `Valvula`, `Separador`, `Pozo`, `Medidor`, `Linea`, `Marca`, `Cifra` y `ContraMeta`.
   - Reemplazan a `IndicadorFijo`, `Sparkline`, `Simbolos.tsx` y `MarcaCondicion`.
   - Se borran los que se dupliquen.
2. **La regla del auditor:** ningún indicador ni tendencia hecho a mano fuera del kit. Es un grep de `<svg` en `pages/` y `widgets/` que no venga del kit, más las comprobaciones I1–I7 y E1–E6 de X2.
**Hecho (K3, 27-oct):** el kit vive en `src/shared/ui/scada/` (no en `kit/`) y ya se usa en todas partes.
- `Sparkline`, `BarraMeta`, `IndicadorFijo` (`Analogico.tsx`), `Minitendencia`, `TendenciaFija` y `shared/lib/trazo.ts` se borraron.
- Entraron al kit `ContraMeta` (la barra contra la meta de §6), `Columnas` (las fallas por mes, apiladas en los grises de dato) y `MuestraFluido` (la muestra de una línea en una leyenda). `Esquema` acepta `grupo` (el esquema de planta, con equipos que se abren con el teclado); `Linea`, un camino ya armado (`d`); `Tendencia`, lo proyectado después de hoy (`hoy`, `hasta`, `rango`, `rotuloRango`, `SerieKit.puntos`); `Barra`, `conValor={false}` cuando la fila ya escribe el valor.
- La regla del auditor es «kit» (`e2e/auditoria/detector.ts`): ningún `<svg>` fuera de una pieza del kit (`data-kit`), salvo la marca de 14 × 14 y los íconos. `verificar-kit` comprueba lo mismo en el código: ningún `<svg` en `pages/` ni `widgets/` (salvo el ícono de `configuracion/marcas.tsx`).

3. **Los datos que el kit pide y el motor todavía no da:**
   - el rango declarado del instrumento (hoy, «escala provisional»);
   - «parado normal» contra «parado anormal» (X2 §4.3);
   - la vigencia del tag para «sin comunicación desde HH:MM».
