# X5 · Sistema de diseño: la mezcla de B, C y A

**25-oct-2026 · X5, director de diseño del equipo.** Sigue el `BRIEF.md` de esta carpeta y parte de X1 (identidad y las tres direcciones), X2 (la norma, la paleta y las 44 comprobaciones), X3 (las librerías) y X4 (la arquitectura por rol). No toca código del producto.

Todo lo de este documento está en el repo:

- `IMG = docs/experiencia-v2/imagenes/`: las imágenes en alta fidelidad (PNG, escala 2).
- `IMG/fuente/`: el HTML y el CSS de cada imagen (`sistema.css`, `marcas.js` y una página por imagen), los guiones de Playwright (`fuente/scripts/`) y las cifras del demo que usan las imágenes, con la ruta donde se leyó cada una (`fuente/datos/datos-demo.json`).

**Las cifras son las del demo.** Se leyeron el 25-oct en el servidor de desarrollo (`http://localhost:5173`, los mismos datos que el demo de 4173), con su reloj: 2 de octubre de 2026, 14:00. Ninguna cifra de las imágenes se inventó. Los rótulos y las frases nuevas son propuesta.

## Índice

1. [La mezcla: qué se toma de B, de C y de A](#1-la-mezcla-qué-se-toma-de-b-de-c-y-de-a)
2. [Principios](#2-principios)
3. [Tokens](#3-tokens)
4. [Navegación](#4-navegación)
5. [Componentes](#5-componentes)
6. [ISA-101 dentro del sistema](#6-isa-101-dentro-del-sistema)
7. [Las imágenes](#7-las-imágenes)
8. [Revisión: las 44 comprobaciones de X2 y los 10 segundos](#8-revisión-las-44-comprobaciones-de-x2-y-los-10-segundos)
9. [Desacuerdos](#9-desacuerdos)
10. [Fuentes](#10-fuentes)
11. [Resumen](#11-resumen)

---

## 1. La mezcla: qué se toma de B, de C y de A

Lo que decidió el dueño (25-oct): «una mezcla de las tres, prevaleciendo la B como una cifra»; la navegación «de costado, como están las demás»; el azul se queda; la tubería «como se ve en la C»; los gráficos «como se muestran en la A». La vista del gerente se llama **«La planta viva»**.

**Cómo lo precisó el dueño (25-oct, segunda vuelta):** el diseño es el de B, sin mezcla de estilos: todo se ve como B. La tubería de C va **dentro** de la tarjeta principal de B, en lugar de su línea de 4 puntos, y se dibuja con el lenguaje de B, no con el aspecto industrial oscuro de C. Los gráficos y las cifras de A se redibujan en el estilo de B. La franja azul de arriba pasa a ser un **panel lateral izquierdo** azul; en el teléfono, ese mismo panel se abre desde la izquierda con el botón de menú, sin barra inferior ni pestañas arriba.

| De | Se toma | No se toma |
|---|---|---|
| **B · «Una cifra»** (el diseño entero) | El papel cálido de fondo y las tarjetas blancas sin borde, de radio 20, separadas por el tono. **Una cifra grande con su frase debajo**, en palabras de campo y de usted. Los botones de píldora. La letra Air en frases, sin mayúsculas espaciadas. Las filas de 56 a 64 px con «›». La columna principal y la lateral de 352 px. **El índigo #142d88** como marca y como color de la interacción. En el teléfono, todo: la banda índigo arriba, una pregunta por pantalla, las opciones grandes. | **La navegación arriba** (Resumen · Diferidos · Producción · Riesgo): pasa al panel lateral. El aviso en amarillo con triángulo del teléfono: «No arrancar» es un bloqueo de procedimiento y va en tinta, sin color (X2 §4.2). |
| **C · «La tubería»** (el contenido del dibujo) | **El proceso**: yacimiento → pozos → planta → salida → venta, con el ramal del agua que vuelve al yacimiento por los inyectores. Las capas de X4 §4.2: el contorno es lo que cabe, el núcleo es lo que pasa, y **donde se trabó la tubería se angosta y el hueco va rayado**. «Limita» con doble contorno en tinta. Los equipos por brillo (la bomba parada, oscura; las que no tienen instrumento, sin relleno y discontinuas). La mini-tubería encima de la pregunta del operador. | El aspecto: el gris oscuro, las placas con el corte a 45° y los rótulos en mayúsculas. El tubo es claro y redondeado, con un núcleo gris medio, y sus rótulos van debajo, en frases, como los puntos de la línea de B. Tampoco el ramal con una sola bomba: P-201A y P-201C sí toman el agua (lo dice el demo). |
| **A · «Consola»** (los gráficos y las cifras) | **Producción por día con su barra contra la meta**, **diferido por equipo**, **diferido por día mes a mes** con la raya discontinua del máximo firmado y el cuadrado «3» en el mes que lo pasó, y **el antes, durante y después**. Los **indicadores analógicos** con su banda normal y la tendencia embebida para el nivel 3 técnico. Las cifras con su unidad chica, tabulares. | Su fondo gris, sus bordes duros de 2 px y sus rótulos en mayúsculas condensadas. Todo se redibuja en tarjetas de B. |

**Una sola regla para decidir:** se ve como B. Lo que dice dónde se trabó viene de C; las cifras de evidencia vienen de A.

## 2. Principios

1. **Una pregunta, una cifra, una frase.** Cada vista abre respondiendo la pregunta de su rol (X4 §2) con **una sola** cifra grande, medida, con su unidad y una frase de campo de 20 palabras o menos. Lo demás se abre si se pide (B; X2 §5.6; X4 §3.1).
2. **El proceso es el mapa.** Donde se habla de barriles, se dibuja la tubería: el ojo va de la frase a la cifra y de la cifra al tramo rayado. No es un simulador ni se llama «gemelo digital» en pantalla (X4 §4.1).
3. **Gris lo normal; el color pide algo.** El color es solo de las condiciones anormales y siempre lleva forma y palabra. Lo que pasa bien no se pinta de verde ni de nada (X2 §4; ISA-101 según Hollifield).
4. **El índigo es el marco y la mano, nunca el dato.** El índigo de TRIM va en el panel lateral, en la banda del teléfono, en el botón principal, en lo seleccionado y en el foco. Nunca en una cifra, una serie, una tubería ni un equipo (X1 §4.0, punto 3; X2 §4.1, punto 1).
5. **Lo medido manda; lo simulado acompaña, y se nota.** Lo simulado y lo proyectado van con su palabra, con trazo discontinuo y nunca más grandes ni más arriba que lo medido (X2 B14 y I7; X4 §3.1, regla 7). **Diferido no es pérdida**: el diferido «se deja de producir», «no pasa» o «se trabó»; la pérdida es lo que salió y no se vendió.
6. **Las mismas puertas en todas partes.** Hoy · La planta viva · Equipos · Resultados, en el mismo orden, en el panel azul del escritorio y en el mismo panel que abre el menú del teléfono. La misma marca para el mismo equipo en todas las pantallas (X4 §3.2; X2 F2).
7. **Nada se mueve para decorar.** Nada parpadea y la tubería no «fluye». Solo se mueve la navegación, en 200 ms o menos, y con `prefers-reduced-motion` nada (X2 §5.5 y M1; X3 §4.4).

---

## 3. Tokens

Están en `IMG/fuente/sistema.css` como variables CSS, con los mismos nombres en los dos temas. Así cambia el tema sin tocar los componentes, como hoy en `src/index.css`. La medición completa está en `IMG/fuente/datos/medicion-paleta.txt` (guion `fuente/scripts/medir-paleta.mjs`, el método de X1 §3.5: WCAG 2.2 y separación OKLab ×100 con la simulación de Machado, Oliveira y Fernandes, 2009). **Resultado: 0 fallas.**

### 3.1 Color de marca e interacción

| Token | Papel (claro) | Noche (oscuro) | Para qué | Medido |
|---|---|---|---|---|
| `--marca` | `#142d88` | `#142d88` | El panel lateral, la banda del teléfono, la placa del isotipo | Blanco encima: 11,93:1 |
| `--marca-tenue` | `#c9d1f0` | `#c9d1f0` | Rótulos inactivos del panel; la segunda palabra del momento activo | Sobre el índigo: 7,87:1 |
| `--marca-capa` | blanco al 14 % | igual | La puerta activa del panel | Blanco sobre la capa: 8,11:1 |
| `--primario` · `--primario-sobre` | `#142d88` · blanco | `#f3f4f5` · `#15171a` | El botón principal (píldora) y el momento escogido | 11,93:1 · 16,31:1 |
| `--marca-suave` | `#e8ebf6` | `#1d2440` | Lo seleccionado sobre papel: la fila escogida, el ícono de la puerta | Tinta encima: 15,09:1 · 13,83:1 |
| `--foco` | `#142d88` | `#f3f4f5` | El anillo de foco del teclado (2 px, separado 2 px) | 11,53:1 · 13,11:1 |

El índigo queda lejos de los cuatro colores de estado, también con daltonismo: el par más cercano es índigo contra morado, 19,85 con visión normal y 11,02 con deuteranopía (en claro). **Nunca va en un dato, una serie, una tubería ni un equipo.**

### 3.2 Neutros (los de B, medidos por X1)

| Token | Papel | Noche | Uso |
|---|---|---|---|
| `--suelo` | `#efede8` | `#1a1d21` | Fondo de la página |
| `--superficie` | `#f6f5f1` | `#202328` | Hojas y paneles grandes |
| `--panel` | `#fcfbf8` | `#262a2f` | Tarjetas |
| `--panel2` | `#f3f1ec` | `#23272c` | Pozos dentro de una tarjeta, el control de momentos |
| `--elevado` | `#ffffff` | `#2e3238` | Menús, el panel abierto en el teléfono |
| `--linea` · `--linea2` | `#dcd9d2` · `#e8e5df` | `#383d44` · `#2e3238` | Bordes y separadores de fila |
| `--tinta` · `--tinta2` · `--tinta3` | `#15171a` · `#464b52` · `#5b6168` | `#f3f4f5` · `#c8cdd3` · `#a3aab2` | Texto. Mínimo sobre los 5 fondos: 15,35 · 7,51 · 5,35 (papel) y 11,70 · 8,06 · 5,49 (noche) |
| `--dato1` | `#3a3f45` | `#d9dde1` | Barras principales («alto impacto») y la barra contra la meta: 9,08 y 9,44 mín. |
| `--dato3` · `--pared` · `--agua` · `--flujo` (papel) | `#7a8087` | `#878e96` (`--flujo` `#9aa1a8`) | Barras secundarias, la pared del tubo, el ramal del agua y el núcleo de lo que pasa: 3,41 y 3,89 mín. (≥ 3:1, WCAG 1.4.11) |
| `--rayado` | `#464b52` | `#c8cdd3` | Las rayas de lo que no pasa: 7,51 y 8,06 |
| `--tubo-vacio` · `--roca` · `--pista` · `--banda` | `#e9e6df` · `#dcd8cf` · `#e2dfd8` · `#cdccca` | `#2d3237` · `#32373d` · `#33383e` · `#5d6165` | El interior vacío del tubo, el yacimiento, la pista de una barra y la banda normal de un indicador (tono, sin función de contraste: sus extremos llevan raya en `--tinta3`, 6,05:1) |

El oscuro es **gris muy oscuro, nunca negro** (X1 §2.4; X2 §4.7). El claro va por defecto, en la oficina, en la sala iluminada y en el teléfono al sol. El oscuro lo escoge cada persona o lo fija la guía del sitio para una sala atenuada.

### 3.3 Estado: la paleta de X2, exacta, con forma y palabra

| Condición | Papel | Noche | Forma (14 × 14) | Palabra | Mínimo contra los 5 fondos |
|---|---|---|---|---|---|
| Interlock | `#8b1a1a` | `#ff8080` | candado | «Interlock · baja succión (PSL-2011)» | 7,94 · 5,31 |
| Alarma (prioridad 1) | `#bf4000`, número blanco | `#ffb347`, número `#1f2328` | rombo con «1» | «Alarma» | 4,55 · 7,24 |
| Atención (prioridad 2) | `#f9a825` con trazo `#1f2328` | `#fff176` | triángulo con «2» | «Atención» | trazo 13,50 · 11,10 |
| Aviso (prioridad 3) | el mismo amarillo, con trazo | `#fff176` | cuadrado con «3» | «Aviso» | trazo 13,50 · 11,10 |
| Sin comunicación | `#8420a3` | `#c99cff` | círculo punteado; el valor pasa a «---» | «Sin comunicación desde 14:07» | 6,61 · 5,94 |
| Dato inválido | el mismo morado | `#c99cff` | círculo punteado con raya | «Dato inválido · fuera de rango» | 6,61 · 5,94 |
| Falta · sin instrumento · medido a mano · anticipa | `--tinta3` | `--tinta3` | contorno discontinuo · corchetes · reloj · flecha | «falta la causa», «sin instrumento», «medido a mano hace 42 d», «anticipa · cruza en 33 d» | — |
| No arrancar (bloqueo de procedimiento) | `--tinta` | `--tinta` | círculo con barra «⊘», en una franja con borde de 2 px | «No arrancar hasta identificar qué se dañó» | — |
| Normal | sin color | sin color | punto, solo en listas mixtas | nada | — |

Los tintes de fondo de cada condición (`--interlock-f`, `--p1-f`, `--p2-f`, `--sincom-f`) son los de X2 §4.4; la tinta encima da de 13,47 a 15,48:1. **Separación con daltonismo** (peor de los cuatro tipos de visión): en papel, todas las parejas quedan entre 11,13 y 44,92; en noche, entre 10,43 y 33,30. Ninguna baja de 10.

**Las píldoras blancas del panel y de la banda** (el campo) son superficie clara en los dos temas: llevan siempre la paleta de estado clara, para que el rombo naranja no pierda contraste sobre el blanco.

### 3.4 Tipografía: Air

Una sola familia, **Air** (Positype), en cuatro pesos: Regular para leer, Medium para la frase, Semibold para rótulos y botones, Bold para las cifras. **Air Condensed** solo para los tags de equipo dentro de una lista o una placa técnica (`P-201B`, `LC-21`) y para los meses de un eje. Todas las cifras van con `tabular-nums`, porque las cifras por defecto de Air son proporcionales (X1 §3.1). Punto de miles y coma decimal: `1.966`, `89,6 %`.

| Paso | Escritorio | Teléfono | Uso |
|---|---|---|---|
| Rótulo | 13 | 13 | Metadatos, ejes, leyendas, el sub-rótulo de un tramo |
| Dato | 14–15 | 15 | Filas, tablas, valores que deciden en el escritorio (≥ 14, X2 T3) |
| Cuerpo | 16 | 16 | Botones, filas de una lista |
| Frase de lectura | 17–18 | 16–17 | La explicación bajo la cifra (16′ de arco ≈ 18 px a la distancia del escritorio: X2 B16) |
| La frase | 22 | 19–20 | «se dejan de producir en La Ceiba.» |
| Cifra secundaria | 20–26 (como mucho 4 por vista) | 20–24 | La cifra de una tarjeta |
| Cifra principal | 54–72 (68 en La planta viva) | 48–52 | La única cifra grande (X2 T1) |
| Valor del operador al sol | — | ≥ 18 | Lo que se lee con guantes y al sol (X2 §5.6) |

**Nada mide menos de 12 px.** La única excepción es el número dentro de una marca de prioridad («1», «2», «3»), que es parte del símbolo: va a 7,8 unidades de un dibujo de 14 (unos 9 px en una marca de 16 px). Su significado lo llevan también la forma, el color, la palabra al lado y el nombre accesible («Prioridad 1, alarma»). Las imágenes se revisaron con un guion que lista todo texto de menos de 12 px (`fuente/scripts/render.mjs`): solo salen esos números.

### 3.5 Espacio, radios, sombras y movimiento

- **Espacio:** unidad de 4 px; la escala es 4 · 8 · 12 · 16 · 20 · 24 · 32. Separación entre tarjetas: 16 en el escritorio y 12 en el teléfono. Relleno de una tarjeta: 22–28 en el escritorio y 16–20 en el teléfono. Margen de la página: 32 en el escritorio y 16 en el teléfono.
- **Radios (B):** 20 la tarjeta; 14–16 un pozo o una opción dentro de ella; píldora (999) los botones, los chips y el control de momentos; 12 el ícono de la marca plegada. Los dibujos de proceso redondean sus extremos, sin 3D.
- **Sombras:** ninguna en las tarjetas (se separan por el tono, como en B) ni en los dibujos de proceso (X2 B12, E4). Solo lo que flota sobre otra cosa lleva sombra: el panel abierto en el teléfono, un menú y una hoja (`--sombra-flota`).
- **Movimiento:**
  - los cambios de estado son instantáneos;
  - el paso del cursor y el foco, 120 ms;
  - la navegación (abrir un tramo, una ficha, el panel del teléfono) dura **200 ms o menos**, con `cubic-bezier(.2, 0, 0, 1)`, hecha con View Transitions del navegador (X3 §4.4);
  - con `prefers-reduced-motion`, nada se mueve;
  - nada parpadea y la tubería no «fluye»; las cifras cambian sin contar hacia arriba (X2 §5.5);
  - en el teléfono, una vibración de 10 ms al registrar una respuesta, y nunca por una alarma (B).

---

## 4. Navegación

### 4.1 El panel lateral del escritorio

Es la banda índigo de B, de costado. Arriba no queda ninguna pestaña.

| Parte | Desplegado (240 px) | Plegado (88 px) |
|---|---|---|
| La marca | El logo «trim» en blanco | El isotipo en una placa blanca de 44 px |
| El campo | Píldora blanca con la marca de su peor condición: «◆1 La Ceiba ▾». Abre la lista de campos y «Todos mis campos» | La misma píldora, chica, con la marca |
| Las puertas | Ícono de 22 px y nombre de 16 px, en filas de 46 px. La activa lleva la capa blanca al 14 % y el texto en blanco y Semibold; las otras, en `--marca-tenue`. La insignia (lo que pide una acción en Hoy) va en una píldora blanca con número oscuro, nunca en un color de estado | Ícono con su nombre debajo, a 12 px. La insignia, arriba a la derecha del ícono |
| El pie | «¿Cómo se lee?», la persona (iniciales, nombre y rol) y el botón **Plegar** | «?», las iniciales y **Desplegar** |

- **Las puertas son las de X4 §3.2, en orden fijo:** Hoy · **La planta viva** · Equipos · Resultados. Cada rol ve las suyas: el gerente, La planta viva · Equipos · Resultados; el supervisor, el operador y el técnico, Hoy · La planta viva · Equipos; producción, el jefe y confiabilidad, las cuatro. La puerta se llama como la vista que escogió el dueño, «La planta viva», y es la misma para todos los roles. Así quien tiene dos roles reconoce el mismo dibujo.
- **Plegar:** con el botón del pie o con la tecla «[». Se recuerda por persona. Por debajo de 1280 px de ancho arranca plegado. En una consola de sala de control, la guía del sitio puede fijarlo plegado.
- **Arriba del contenido** van las migas («Todos mis campos › La Ceiba › Agua › P-201B»), el título de la vista con la hora de los datos, y a la derecha **la franja de condiciones** (X2 §3.5): una píldora por condición, de la más grave a la más leve, con su forma, su cantidad y su palabra, y «sin comunicación» al final. Es la misma en todo nivel 1, 2 y 3, y cada cuenta abre su lista.

### 4.2 En el teléfono: el mismo panel, que abre el botón de menú

Lo decidió el dueño: **el mismo panel azul se abre desde la izquierda con el botón de menú (☰)**, sin barra inferior y sin pestañas arriba.

- **La banda índigo de B** queda arriba, de 64 a 72 px: el ☰ a la izquierda, el campo en una píldora blanca y la persona a la derecha. En las pantallas de una pregunta, la banda lleva además la pregunta en blanco, como en B.
- **El panel** ocupa el 84 % del ancho (328 px de 390), entra en 200 ms y deja ver detrás la pantalla oscurecida al 40 %. Tiene las mismas puertas, en el mismo orden y con la misma insignia que el escritorio. Se cierra tocando afuera, deslizando a la izquierda o con la puerta escogida.
- **Para que el menú no esconda lo urgente:**
  - el ☰ lleva la insignia de Hoy (por ejemplo, «3»), así se sabe que hay algo sin abrirlo;
  - cada rol **abre en su respuesta** (X4 §3.4): el operador en su primera pregunta, el supervisor en su Hoy y el gerente en La planta viva; cambiar de puerta es lo raro, no lo de todos los días;
  - desde una tarjeta de Hoy se llega a su equipo con un toque, sin pasar por el menú.
- **Lo que cuesta, dicho:** cambiar de puerta toma 2 toques (☰ y la puerta) en lugar de 1. X4 midió que hoy el teléfono, que ya usa un menú, deja la respuesta del supervisor y del operador a 2 toques y un desplazamiento (X4 §1.3, punto 8), y recomendaba barra inferior (Android, «3 a 5 destinos»). Con el arranque en la respuesta de cada rol, la tarea principal queda a 1 toque igual (X4 §5.2), que es lo que mide la prueba de campo O1 y S1. Está en Desacuerdos (§9).

---

## 5. Componentes

Todos están dibujados en las imágenes de §7, con SVG y HTML propios, sin librerías de diagramas ni de gráficos (X3 §5.1). El código de las imágenes es `IMG/fuente/sistema.css` (los tokens y la base), `marcas.js` (las marcas y los íconos), `tuberia.js` (la tubería y las barras) e `indicadores.js` (el analógico, la tendencia y el esquema del tren). Es para mirar, no es código del producto, pero cada pieza se puede pasar a un componente de React tal cual.

### 5.1 La cifra principal con su frase (B)

- **Anatomía, de arriba abajo:**
  - el previo («Ahora mismo», 15 px, `--tinta2`);
  - **la cifra**, Air Bold, de 54 a 72 px en el escritorio y de 48 a 52 en el teléfono, con su unidad dicha en palabras al lado («barriles por día», 20 a 24 px, `--tinta2`);
  - **la frase**, 22 px Medium: «se dejan de producir en La Ceiba.»;
  - la explicación, como mucho 2 renglones a 17–18 px, que nombra el equipo y su familia: «La bomba de agua P-201B paró a las 03:52 y obligó a cerrar dos pozos»;
  - los botones: uno principal (índigo) y uno secundario. Nunca más de dos.
- **Una sola por vista** (X2 T1). Siempre es medida o calculada, nunca simulada.
- **Nunca en color.** Si la cifra es anormal, la marca va antes del previo (imagen 4: «◆1 Alarma · parada desde hoy, 03:52»).
- **Vigencia:** la hora de los datos va en el título de la vista («datos de las 14:00»).

### 5.2 La tarjeta

- `--panel` sobre `--suelo`, radio 20, sin borde ni sombra. Relleno de 22–28 px en el escritorio y de 16–18 en el teléfono.
- **Cabecera:** el título (15–16 px Semibold) a la izquierda y el alcance o la calidad a la derecha («octubre · calculado», «simulado» en su chip discontinuo).
- **Filas:** de 56 a 64 px, separadas por `--linea2`, con «›» cuando abren algo. La cifra de la fila va a 24 px, con su contexto en una barra contra la meta (§5.4).
- **Variantes:** la tarjeta de tarea de Hoy (§5.7), la de lo simulado (chip «simulado» y un enlace «Ver el plan»), y la franja de bloqueo, que no es una tarjeta sino una advertencia con borde de 2 px en tinta.

### 5.3 La tubería (C, con el trazo de B)

Es la pieza central de «La planta viva» y reemplaza la línea de 4 puntos de B **dentro** de la tarjeta principal, bajo el título «Dónde se trabó» y el control de momentos.

| Capa | Cómo se dibuja | Qué dice |
|---|---|---|
| **Yacimiento** | Bloque redondeado `--roca` con puntos, sin borde ni número | «la roca» |
| **El contorno** | Tubo claro (`--tubo-vacio`) con pared de 1,5 px (`--pared`), redondeado, con reducciones suaves entre tramos. El alto es proporcional a lo que cabe (pozos 11.857, planta 13.000, salida 14.000 bbl/d) | Lo que cabe |
| **El núcleo** | Banda `--flujo` del mismo grosor en todos los tramos, centrada, con la flecha a la venta. Proporcional a lo que pasa (9.394 bbl/d) | Lo que pasa ahora |
| **El angostamiento** | **En el tramo donde se trabó, la pared se aprieta hasta lo que hoy puede pasar** (en la planta de La Ceiba, sin P-201B, unos 9.445 bbl/d de crudo, según el demo). La pared de siempre queda como línea discontinua | Aquí se trabó |
| **El hueco rayado** | Rayas a 45° en `--rayado`, con su borde, **adentro del angostamiento**, encima del núcleo. Alto proporcional a lo que no pasa (1.665 bbl/d) | Lo que no pasa |
| **«Limita»** | Doble contorno en tinta alrededor del tramo, y «◄ limita» en su rótulo. Nunca rojo (U2 §0.4) | El tope de hoy |
| **Los rótulos** | Debajo de cada tramo, como los puntos de B: el nombre (15 px Semibold) y una frase (13 px): «Planta · aquí se trabó / no pasan 1.665 bbl/d» | — |
| **El ramal del agua** | Baja de la planta, pasa el tanque (de pie, con su nivel gris y la raya del alto-alto) y las tres bombas en paralelo, y vuelve al yacimiento por los inyectores. Flechas fijas | Con 92–97 % de agua, el agua manda |
| **Los equipos** | Solo por excepción. Por brillo: la parada, oscura y con contorno de 2 px; las que no tienen instrumento, sin relleno y discontinuas. **Una sola marca por equipo**, arriba a la izquierda | «P-201B parada desde 03:52» |
| **Sin identificar** | Caja discontinua aparte, que no es un tramo, con «Pedir la causa ›» para el gerente | «LC-21 · 301 bbl/d» |
| **La pérdida** | Una gota en el tramo donde se regó, con su cifra aparte; nunca se suma al diferido. Hoy no hay eventos registrados, así que no se dibuja | — |

- **Escritorio:** acostada, de unos 700 px de ancho, dentro de la tarjeta principal.
- **Teléfono:** de pie (U2 §2.6), con los rótulos a la derecha. El ramal del agua va como un renglón propio que sale de la planta.
- **Por fila:** en «Todos mis campos», cada campo lleva su tubería en chico, con el tramo trabado angostado y rayado, y la marca del equipo en el renglón de abajo.
- **Accesible:** el `aria-label` del dibujo es la frase; con Tab se recorren los tramos y Enter abre la hoja del tramo (U2 §2.8, X3 §3.5).

### 5.4 Los gráficos y las cifras de A, en estilo B

- **Barra contra la meta** (*bullet*): pista `--pista` de 10 px, la barra en `--dato1` y la meta como una raya vertical de 3 px en tinta (Few, X2 §5.2). Si se sale, la marca va junto al rótulo: «■3 Aviso · producción por día, bajo la meta · 10.700 de 10.900 bbl/d». Lo proyectado va con contorno y rayado, y con su palabra.
- **Barras mes a mes:** 13 meses del diferido por día, apiladas en dos grises (alto impacto oscuro, lo demás medio), con la tapa redondeada. La raya discontinua del máximo firmado va en cada mes, y el «■3» sobre el mes que lo pasó (febrero, 834 contra 800). El mes en curso lleva un contorno discontinuo y su cifra en la cabecera de la tarjeta («octubre: 661 bbl/d»). Los meses se rotulan de tres en tres.
- **Diferido por equipo:** una fila por equipo, con la marca y su palabra, el tag en Air Condensed, la familia, los barriles, el porcentaje y una barra de 5 px.
- **El antes, durante y después** cuantificado (lo que todavía se puede mover, simulado): tres columnas con una raya arriba; la del momento escogido, en índigo.
- **Indicador analógico** (nivel 3; X2 §5.1):
  - una pista con la banda normal en `--banda` y rayas de `--tinta3` en sus extremos;
  - el límite de alarma, una raya de 2,4 px en tinta;
  - el puntero en tinta, un triángulo con su línea;
  - el valor en tinta, a la derecha, con su unidad chica, y el texto del límite debajo («normal 320 – 445»);
  - escala fija por instrumento. Mientras el motor no dé el rango del instrumento ni el disparo (X2 §7, pedido 4), la escala no rotula sus extremos y no se dibuja disparo;
  - con el equipo parado, puntero y valor en gris y sin marca propia (X2 B9).
- **Minitendencia:** 12 lecturas diarias, la banda normal sombreada y el último punto. 80 × 32 px en la fila de la señal.
- **Tendencia grande:** gráficas chicas iguales, una por variable, como mucho 4 trazas (X2 §5.3). Lleva la ventana escrita («21 sep» → «hoy, 2 oct»), la banda, la alarma en discontinuo y la escala que no cambia.

### 5.5 La fila de equipo

`[marca] TAG · familia · palabra de la condición ……… cifra ›`

- La marca, a 15–16 px; el tag, en Air Condensed Bold.
- La familia en palabras de campo: «bomba de agua», «electrosumergible», «aire de instrumentos».
- La cifra a la derecha, tabular, con su porcentaje o su unidad debajo.
- Sin condición, no lleva marca (ni el punto: la lista no es mixta). «Sin instrumento» lleva los corchetes y su palabra.
- Toda la fila abre el equipo (nivel 3) con un toque.

### 5.6 Las marcas de estado y la franja de condiciones

- **Las marcas** son las de §3.3: 14 × 14, a 12–16 px en el escritorio y a 14–16 en el teléfono, siempre con la palabra al lado en listas y fichas («Alarma · P-201B…»). En un esquema la marca puede ir sola; la palabra va entonces en el rótulo vecino y en el nombre accesible.
- **La franja** es una píldora por condición, de la más grave a la más leve, con la forma, la cantidad fuera de la forma y la palabra: «◆ 2 alarmas · ▲ 2 en atención · ■ 1 aviso · ◌ 0 sin comunicación». En el teléfono la palabra se acorta («atención») y «sin comunicación» queda solo con su forma y su número cuando es 0.
- **El bloqueo de procedimiento** («No arrancar hasta identificar qué se dañó») no es un color: es una franja en tinta con borde de 2 px y el círculo con barra, fija arriba de la lista o de la ficha. En el teléfono del operador va a 18 px.

### 5.7 La tarjeta de tarea de «Hoy»

La anatomía de X4 §3.3, de arriba abajo:

1. **verbo + qué** (17–18 px Semibold): «Confirmar 2 paradas iguales»;
2. **dónde**, con la marca del equipo (no de la tarea) y su palabra: «◆1 Alarma · P-201B cerró LC-07 y LC-16 · 05:43»;
3. **por qué importa**, en una línea: «TRIM las dedujo: en la planta, no planeada»;
4. **la acción, de un toque**: el botón principal («Confirmar las 2»), y a la derecha «Ver una por una ›».

- **Orden de la lista:** primero lo que dice «no» (va como franja arriba), después lo que tiene hora y después los barriles en juego.
- **Al hacerla**, la tarjeta pasa a «Hecho hoy (n)» y aparece un aviso oscuro abajo con «Deshacer» por unos segundos.
- **La insignia** de Hoy cuenta las tarjetas que piden algo.

### 5.8 La pregunta de una sola respuesta (teléfono)

- **La banda índigo** lleva la pregunta en blanco, a 27 px («¿Qué parte se dañó?»), con la línea del equipo arriba («P-201B · bomba de agua · paró hoy a las 03:52, hace 10,1 h») y «Pregunta 1 de 4».
- **Debajo, en orden:**
  - la franja de condiciones;
  - el bloqueo «No la arranque hasta decir qué se dañó» (18 px);
  - la mini tubería con el tramo del equipo marcado (pozos · **planta · agua** · salida);
  - la pista («Lo que más le ha fallado a esta bomba»);
  - **las opciones**, de 64 px o más, con el título a 18 px y el dato a 15 px («Sello mecánico · 5 de sus 8 fallas»). Siempre está «Todavía no sé»;
  - «Lo que encontró, o una foto (si quiere)».
- **Contestar es un toque:** queda registrado a nombre de quien contesta, con la hora del sistema; sale el aviso con «Deshacer» y entra la siguiente pregunta. No hay botón «Siguiente».
- **Vibración de 10 ms** al registrar.

### 5.9 Antes · Durante · Después

- **Un control de píldora de tres posiciones** sobre la tubería, en el orden Antes · Durante · Después, con su aclaración corta en el escritorio («lo que viene», «ahora», «lo que pasó»). **Sin los números 1, 2 y 3**, que son de las prioridades (X2 F4).
- El escogido va en índigo (`--primario`), y abre en Durante.
- **Cambia el dibujo y la cifra grande:**
  - en **Antes**, la tubería va llena, los equipos que avisan llevan su marca y una línea punteada de riesgo («K-101 ya pasó el límite»), y la cifra pasa a un conteo y un nombre;
  - en **Durante**, el angostamiento rayado de hoy;
  - en **Después**, una barra gris bajo cada tramo con lo que no se produjo en el período («octubre ▾»).
- **Lo simulado** de cada momento va aparte, en su tarjeta con «simulado»; nunca como cifra grande.

### 5.10 Los estados vacíos

Tienen el mismo alto que la versión con datos (Stripe, X1 §2.1) y enseñan con una frase:

| Situación | Lo que se ve |
|---|---|
| Nada deja de producirse | La tubería llena, sin angostamiento ni rayado. «La Ceiba produce sin paradas ahora.» La cifra: «0 barriles por día se dejan de producir» |
| Nada se trabó en el período | «Nada se trabó en octubre (en curso).» |
| Hoy sin tareas | «Nada pendiente. El campo está normal.», y el enlace a La planta viva |
| Franja vacía | Una píldora gris: «nada anormal» |
| Campo de gas | «La Zarza es un campo de gas: su tubería todavía no está.» |
| Sin dato de un tramo o del ramal | El tramo en gris discontinuo, con «sin dato» |
| Sin comunicación | La marca morada, la cifra en «---» y «sin comunicación desde 14:07». La cifra grande dice «al menos» si le falta ese caudal |
| Pérdida | «Pérdida: nada registrado en octubre» (en la leyenda), hasta que TRIM registre pérdidas |

---

## 6. ISA-101 dentro del sistema

Las reglas de X2 (§1 a §5), dichas como reglas del sistema. TRIM no declara «cumplimiento ISA-101»; sigue su ciclo de vida con una guía de estilo escrita (esta) y configurable por operadora (X2 §1.1).

1. **Gris lo normal.** Fondos, tubería, barras y tendencias en grises. El índigo no es un estado: es el marco y la interacción. Ningún estado es azul ni verde (X2 §4.1).
2. **El color, siempre con forma y palabra.** Cuatro tonos y nada más: rojo para el interlock, naranja para la alarma, amarillo con trazo para la atención y el aviso, y morado para «no le crea a este número». La palabra va al lado en listas y fichas (X2 §4.2, F1).
3. **El texto nunca se pinta.** El valor va en tinta y en negrita si es anormal; la marca, a su izquierda (X2 B5, C1).
4. **Una marca por equipo, la misma en todas partes.** Con el equipo parado, sus señales van en gris y sin marca propia (X2 B9, B10, F2, E3).
5. **El equipo se ve por brillo.** En marcha, claro; parado, oscuro con contorno de 2 px; sin instrumento o sin dato, sin relleno y discontinuo. La caja no se tiñe (X2 §4.3, E1, E5).
6. **«Limita» es gris.** Doble contorno y la palabra, nunca rojo (U2 §0.4).
7. **Nada se mueve para decir que algo corre; nada parpadea.** Solo la navegación, en 200 ms o menos, y con `prefers-reduced-motion`, nada (X2 §5.5, M1, M2).
8. **Indicadores de alto desempeño:** escala fija, banda normal siempre visible, alarma marcada y puntero en tinta. Tendencia embebida con su ventana escrita (X2 §5.1, §5.3).
9. **Una cifra grande por vista, y medida.** Lo simulado y lo proyectado van más chicos y con su palabra (X2 T1, B14, I7).
10. **Jerarquía de 4 niveles:** «La planta viva» (todos los campos o el campo) → el tren → el equipo → el diagnóstico, con migas. Nada a más de 3 toques. La franja de condiciones va en el mismo lugar en los niveles 1, 2 y 3 (X2 §3; X4 §5).
11. **El dato dice su calidad y su hora:** «calculado», «simulado», «proyectado», «datos de las 14:00» y «sin comunicación desde…» (X2 D1–D3).
12. **2D, sin sombra ni halo** en los dibujos de proceso (X2 B12, E4).
13. **La letra se mide en ángulo:** nada bajo 12 px; los valores que deciden, 14 px o más en el escritorio y 18 px en el teléfono de campo (X2 B16, T3).
14. **La guía del sitio manda.** Los tokens de estado se pueden cambiar por la guía de la operadora y quedan bloqueados para todo lo demás. El índigo de la marca también se puede cambiar: por ejemplo, la guía de una sala de control puede fijar el panel plegado o en grafito (X2 §1.8; X1 §2.3, Aura).

---

## 7. Las imágenes

Todas están en `docs/experiencia-v2/imagenes/`, a escala 2, con las cifras del demo (La Ceiba, 2 de octubre, 14:00; `fuente/datos/datos-demo.json` dice de qué pantalla salió cada una). Se vuelven a generar con `sh imagenes/fuente/scripts/renderizar-todo.sh`, que abre cada HTML desde `file://` (sin servidor) y además revisa los textos de menos de 12 px, los textos que se pisan y las cifras grandes.

| # | Archivo | Qué muestra |
|---|---|---|
| 1 | `1-planta-viva-escritorio-claro.png` (1440 × 900) | **«La planta viva» del gerente, La Ceiba.** Panel azul desplegado. La cifra de B: «1.966 barriles por día se dejan de producir en La Ceiba», con su explicación y dos botones. Dentro de la misma tarjeta, «Dónde se trabó»: Antes · Durante · Después y la tubería de C con el trazo de B (la planta angostada y rayada; «limita» en los pozos; el ramal del agua con el tanque, las tres bombas y P-201B parada; LC-21 aparte). Debajo, filas de A: el diferido del mes (calculado) y la producción por día contra la meta. A la derecha: lo que se puede mover (simulado) por momento, el diferido por equipo, el diferido por día de 13 meses contra el máximo, y «¿Está bajando?» |
| 2 | `2-planta-viva-telefono.png` | **La planta viva en el teléfono**, tres pantallas: «Todos mis campos» (2.650 bbl/d, una fila por campo con su tubería en chico), La Ceiba con la tubería de pie, y el panel azul abierto con el menú |
| 3 | `3a-hoy-supervisor-escritorio.png` (1440 × 900) | **«Hoy» del supervisor**: la cifra, «No arrancar P-201B», las tres tarjetas en orden (confirmar 2 paradas iguales, conseguir la causa de LC-21 y LC-08, seguir la orden de K-101), «Lo más frágil: el agua», y al lado la planta en chico, el turno en WhatsApp y el diferido de las últimas 12 h |
| 3 | `3b-hoy-supervisor-telefono.png` | **«Hoy» en el teléfono**: al abrir, y después de «Confirmar las 2», con «Hecho hoy», «Deshacer» y «Entregar turno» |
| 4 | `4-p201b-nivel3-escritorio.png` (1440 × 900) | **P-201B, nivel técnico tipo SCADA de alto desempeño**, con el panel plegado. La cifra (1.665 bbl/d) y el bloqueo; las 8 señales con su indicador analógico, su banda normal, su alarma y su minitendencia de 12 días (en gris por estar parada); el esquema del tren de agua con las burbujas PI, PDI y FI; «Mientras esté parada» (el agua y el orden de cierre); los 12 días antes de parar (temperatura del cojinete y corriente del motor); su historia y los repuestos |
| 5 | `5-operador-por-contestar-telefono.png` | **El operador, «Por contestar»**: la pregunta 1 de 4 («¿Qué parte se dañó?», P-201B) y, después de un toque, la 2 de 4 («¿Por qué paró?», LC-21, con sus opciones del demo) y el aviso «Registrado: sello mecánico en P-201B · Deshacer» |
| 6 | `6-planta-viva-escritorio-oscuro.png` | **La imagen 1 en tema oscuro** (Noche): gris muy oscuro, la misma paleta de estado de X2 para fondo oscuro, el botón principal claro |
| 7 | `7-lamina-resumen.png` | **La lámina resumen**, con todas en miniatura y la leyenda de marcas |

---

## 8. Revisión: las 44 comprobaciones de X2 y los 10 segundos

### 8.1 Las 44 comprobaciones (X2 §6), sobre las imágenes

**Cómo se revisó:**

- **Automático:** el guion de render lista los textos de menos de 12 px, los textos que se pisan y las cifras de 20 px o más.
- **Medido:** `medir-paleta.mjs` mide el contraste y la separación con daltonismo; `medir-color.py`, la parte de la pantalla con color (resultado en `fuente/datos/medicion-color-en-pantalla.txt`).
- **A ojo:** sobre cada PNG, y la imagen 1 también en grises (`fuente/datos/c8-en-grises.png`).

«No se ve en una imagen» quiere decir que la regla es de comportamiento o de proceso: queda escrita en el sistema y se prueba al construir.

| ID | Resultado | Cómo se vio |
|---|---|---|
| C1 | Pasa | Ningún texto lleva color de condición: el color va solo en las marcas |
| C2 | Pasa | Cada marca tiene nombre accesible («Prioridad 1, alarma»), y la palabra va al lado en listas y tarjetas |
| C3 | **Pasa el color de estado; el índigo del panel, no, si se cuenta** | Color de estado: **0,06–0,08 %** de la pantalla (tope de X2: 3 %). Índigo de marca: 16–17 % con el panel desplegado, 6,5 % plegado y de 4,7 a 20,9 % en las láminas de teléfono, que cuentan el panel abierto. Lo pidió el dueño; ver §9, punto 2 |
| C4 | Pasa | Ningún color de condición en botones, selección, series ni marca. Las barras y la tubería son grises |
| C5 | Pasa, con un matiz | Ningún estado es azul. El índigo es el foco, lo seleccionado y el botón principal, y además el marco de la marca (§9, punto 2) |
| C6 | Pasa | 0 fallas: texto ≥ 4,5:1, formas ≥ 3:1 (el amarillo, con su trazo de 13,50:1), número dentro de la forma ≥ 4,5:1 |
| C7 | Pasa | Peor par con daltonismo: 10,43 (alarma y morado, tritanopía, en oscuro). Ninguno baja de 10 |
| C8 | Pasa | En grises, cada condición se distingue por su forma, su número y su palabra |
| F1 | Pasa, después de corregir | Faltaba la palabra junto a la marca en las listas y las tarjetas. Se agregó: «Alarma · P-201B…», «bomba de agua · alarma» |
| F2 | Pasa | P-201B es ◆1 en las 7 imágenes; K-101, ◆1; LC-21, ▲2 |
| F3 | Pasa | Una sola marca por equipo en cada dibujo (en la primera versión de la imagen 1, P-201B tenía dos; se corrigió) |
| F4 | Pasa | Antes · Durante · Después no llevan números; «Pregunta 1 de 4» es un conteo, no un rótulo de prioridad |
| F5 | Pasa lo que pide B10 | La tarea no cambia la marca del equipo (◆1 en Hoy, igual que en la planta) y no lleva marca propia (X4 §3.3). Ver §9, punto 6 |
| E1 | Pasa | P-201B parada: relleno oscuro y contorno de 2 px. P-201A y P-201C, sin instrumento: sin relleno y discontinuas. En marcha contra parado: 6,26:1 |
| E2 | No se ve en una imagen | El demo no tiene ningún caso sin comunicación (la franja dice 0). La regla y la marca están en §3.3 y §5.10; no se inventó un caso |
| E3 | Pasa | Con P-201B parada, sus 8 señales van en gris y sin marca; la marca la lleva la bomba, una vez |
| E4 | Pasa | Ningún dibujo de proceso lleva sombra ni halo |
| E5 | Pasa | Ninguna caja se tiñe; la marca va arriba a la izquierda del equipo |
| E6 | Pasa | No se dibuja ningún interlock: el demo no lo trae |
| I1 | Pasa (diseño) | La escala de cada señal es fija por instrumento y no depende del valor |
| I2 | Pasa | Puntero y valor en tinta; con la bomba parada, en gris (X2 §5.1, punto 8) |
| I3 | Pasa a medias | Banda normal visible con sus dos rayas. **El disparo no se dibuja**: el motor no lo da (X2 §7, pedido 4), y la pantalla lo dice |
| I4 | No se ve en una imagen | Las series del demo no tienen huecos |
| I5 | Pasa, después de corregir | Cada tendencia dice su ventana («12 días», «21 sep → hoy, 2 oct», «13 meses») y tiene una traza |
| I6 | Pasa | Cada señal continua de P-201B lleva su minitendencia; la discreta dice «no lleva gráfica» |
| I7 | Pasa | Lo simulado (2.133, 2.102) va a 26 px o menos, con «simulado» en un chip discontinuo, por debajo de la cifra medida |
| N1 | Pasa | Las imágenes 1, 3 y 4 caben sin desplazarse en 1440 × 900. En el teléfono, la franja, la cifra y 5 campos (gerente), o la cifra y la primera tarea (supervisor), se ven sin desplazarse |
| N2 | Pasa | La franja de condiciones va arriba a la derecha en el escritorio y en la primera fila en el teléfono, igual en las 7 imágenes |
| N3 | Pasa (diseño) | Cada cuenta de la franja, cada fila y cada marca del dibujo abren su destino con un toque |
| N4 | Pasa | Lo más hondo es La Ceiba › Agua › P-201B, el nivel 3 |
| N5 | Pasa | La ficha técnica es una página, no un panel con velo encima |
| N6 | Pasa, después de corregir | «La planta viva» se llama igual desplegado, plegado y en el teléfono (en la versión plegada decía «Planta viva») |
| T1 | Pasa | Una cifra de 32 px o más por vista (68, 60, 54, 52 y 48 px). Cifras de 20 a 31 px: 3 en la imagen 1 y 1 en las demás |
| T2 | Pasa | `tabular-nums` en todo el cuerpo |
| T3 | Pasa, después de corregir | Nada de texto bajo 12 px, salvo el número dentro de la marca (§3.4). El «No arrancar» del operador subió de 17 a 18 px |
| T4 | Pasa | Cada cifra lleva su unidad y su contexto (meta, máximo, porcentaje); la vista dice la hora de los datos |
| D1 | Pasa, después de corregir | Faltaba «calculado» en los 1.046 bbl y en el diferido por equipo; se agregó, con su rango (889 a 1.203) |
| D2 | Pasa (sistema) | Las cuatro formas existen y son distintas (§3.3). En las imágenes aparecen «sin instrumento» y «sin comunicación: 0» |
| D3 | Pasa | «datos de las 14:00» en cada vista |
| M1 | No se ve en una imagen | Regla de §3.5: 200 ms o menos, y nada con `prefers-reduced-motion` |
| M2 | Pasa (diseño) | Nada parpadea ni «fluye» |
| M3 | No se ve en una imagen | «Repetir la parada», a pedido, con pausa y sin bucle (X2 §5.5); no está dibujado |
| G1 | De proceso | Los tokens están en un solo archivo (`sistema.css`); en el producto, detrás de la `GuiaEstilo` firmada |
| G2 | De proceso | Los guiones de esta carpeta (render, `medir-paleta.mjs`, `medir-color.py`) son una semilla de la revisión en CI |

**En limpio:** de las 44, **36 pasan** (6 de ellas después de corregir: F1, F3, I5, N6, T3 y D1), **2 pasan a medias** (C3 e I3), **4 no se pueden ver en una imagen fija** (E2, I4, M1 y M3) y **2 son de proceso** (G1 y G2). Las dos a medias tienen su razón: el panel índigo lo escogió el dueño (C3), y al motor le falta el disparo (I3).

### 8.2 Un gerente nuevo, 10 segundos, imagen 1

La pregunta: ¿entiende dónde se están dejando de producir los barriles?

1. **Frase y cifra, unos 3 s.** «1.966 barriles por día se dejan de producir en La Ceiba.» Es lo más grande de la pantalla y lo único de ese tamaño.
2. **Por qué, unos 3 s.** «La bomba de agua P-201B paró a las 03:52 y obligó a cerrar dos pozos: 1.665 de esos barriles. Los otros 301 son de LC-21…»
3. **Dónde, unos 4 s.** En el dibujo hay un solo lugar distinto: la planta, donde el tubo se aprieta, con el hueco rayado y el rótulo «Planta · aquí se trabó · no pasan 1.665 bbl/d». La única marca naranja del dibujo está en la bomba parada del ramal del agua, con «P-201B parada desde 03:52».

**Respuesta esperada:** «Se trabó en la planta de La Ceiba, por la bomba de agua P-201B.» **Lo que todavía puede confundir**, y va a la prueba G1 y G6 de X4:

- «◄ limita» está en los pozos y «aquí se trabó», en la planta: son dos ideas distintas una al lado de la otra (el tope de hoy y dónde se quedaron los barriles). Si confunde, «limita» queda para la lente técnica y el gerente ve solo «aquí se trabó».
- «2.133 bbl en el ciclo» puede leerse como algo logrado. Va más chico, con «simulado» y bajo «Lo que todavía se puede mover»: es la trampa de la tarea G8.

En el teléfono (imagen 2), «Todos mis campos» responde lo mismo para el portafolio: la cifra (2.650) y la frase («Lo que más pesa: la bomba de agua P-201B, en La Ceiba»). Además, la primera fila es La Ceiba, con su tubería en chico rayada en el tramo de la planta.

---

## 9. Desacuerdos

1. **Con X4 §3.1 (regla 2) y §3.2: la barra de pestañas abajo en el teléfono.** El dueño decidió otra cosa: el mismo panel azul se abre con el botón de menú, sin barra abajo ni pestañas arriba. Lo sigo, y digo lo que cuesta:
   - cambiar de puerta pide 2 toques en lugar de 1;
   - X4 midió que hoy, con un menú, la respuesta del supervisor y del operador queda a 2 toques y un desplazamiento (X4 §1.3, punto 8).
   
   **Cómo se compensa** (§4.2):
   - cada rol abre en su respuesta, así que la tarea principal sigue a 1 toque;
   - el ☰ lleva la insignia de Hoy;
   - desde una tarjeta se llega a su equipo directo.
   
   Se mide en campo con las tareas O1 y S1 de X4: si 4 de 5 personas no llegan en 2 toques o menos, se vuelve a poner la barra.
2. **Con X2 §6, C3 («≤ 3 % de píxeles saturados», sin contar el logo), y con X1 §4.4.** El panel índigo de B, de costado, ocupa 16–17 % de la pantalla desplegado (6,5 % plegado). El color de estado queda en 0,06–0,08 %. Propongo partir C3 en dos:
   - **C3a, estado:** sin cambios, ≤ 3 % en el demo y ≤ 0,5 % sin nada anormal;
   - **C3b, marca:** el índigo solo en el marco (el panel, la banda del teléfono) y en la interacción (botón principal, selección, foco); nunca dentro de un dato, una serie, una tubería ni un equipo; y como mucho 18 % con el panel desplegado.
   
   La razón: el índigo no se confunde con ningún estado (19,85 contra el morado con visión normal y 11,02 con deuteranopía), es oscuro y no brilla, y no marca un dato. NUREG 1.3.10-2 (X2 §1.5) habla de resaltar lo que se muestra, y el marco no resalta nada. **El riesgo, dicho:** en una sala de control, un panel saturado puede competir con lo anormal. Por eso la guía del sitio puede fijarlo plegado o cambiarlo a grafito sin tocar nada más (§6, punto 14). Lo valida Adair en su tarea A3 (X4 §7.4).
3. **Con X1 §4.3 (dirección C):** no van las placas con el corte a 45°, los rótulos en mayúsculas condensadas ni el gris oscuro de la tubería. Lo decidió el dueño: todo como B. La tubería conserva su anatomía (X4 §4.2) y cambia de trazo.
4. **Con X4 §4.6 b (la tabla de los tres momentos bajo el dibujo, en el escritorio).** La dejé fuera de la vista: el control de momentos cambia el dibujo y la cifra, y lo simulado de cada momento va en su tarjeta. La tabla por tramo pasa a la hoja del tramo y a Resultados. Así la vista cabe en 1440 × 900 y se ve como B. Si la prueba G5 muestra que el gerente necesita ver los tres momentos juntos, vuelve como una cuarta tarjeta.
5. **Precisión a X4 §4.2 (las tres capas).** Para que «la tubería se angosta ahí» se vea, en el tramo donde se trabó la pared se aprieta hasta lo que ese tramo deja pasar **hoy**, y la pared de siempre queda en discontinuo; el rayado va adentro. En La Ceiba, la planta deja pasar hoy unos 9.445 bbl/d de crudo sin P-201B, una cifra que el demo ya calcula. El contorno sigue siendo «lo que cabe»: hoy, en ese tramo, y antes, en discontinuo. **Pedido al motor:** la capacidad de hoy por tramo como dato, no solo dentro de una frase.
6. **Entre X2 F5 y X4 §3.3, la marca en la tarjeta de tarea.** Sigo a X4: la tarjeta lleva la marca del equipo (la misma de todas partes) y la tarea no lleva marca propia. Así se cumple lo que busca B10 (que una tarea no le cambie la marca al equipo) sin que la tarjeta pierda el dato de qué tan grave es el equipo.
7. **Con X4 §3.2 y §4.1 (la puerta se llama «Planta»).** La puerta se llama «La planta viva», el nombre que escogió el dueño, y es la misma para todos los roles. Como sigue sin decir «gemelo digital», no choca con la reserva de `01-propuesta-de-valor.md` §1.6.
8. **Matiz con X2 §5.4, punto 3 (el borde de 2 px en el color de la condición).** El equipo parado lleva el contorno de 2 px en tinta, como pide X2 §4.3. El color va solo en la marca, que es una por equipo. Así el dibujo tiene un solo punto de color por equipo anormal.
9. **Con el teléfono de B (X1 §4.2).** El aviso «No la arranque…» iba en amarillo con el triángulo de atención. Va en tinta, con el círculo con barra, porque es un bloqueo de procedimiento y no una prioridad (X2 §4.2; X4 §5.6).

**Otros pedidos al motor que salieron de las imágenes:**

- **Una sola condición por equipo, de una sola fuente.** Hoy MPP-301 sale ■3 en Planta y ▲2 en Riesgo, y la franja del portafolio tuvo que escoger una (`fuente/datos/datos-demo.json`).
- **El rango del instrumento y el umbral de disparo** de cada tag, para rotular la escala y dibujar el disparo (X2 §7, pedido 4).
- **La vista de «La planta viva» por campo y momento** (X4 §4.11, pedido 1), que hoy hay que juntar de cuatro pantallas.

---

## 10. Fuentes

**Del equipo:** `BRIEF.md`, `X1-identidad-referentes.md` (§1.2, §2, §2.4, §3, §4 y §6), `X2-norma-hmi.md` (§1 a §7), `X3-librerias.md` (§3 a §5) y `X4-arquitectura-roles.md` (§2 a §7), del 25-oct-2026. Las fuentes externas (ISA-101, ISA-18.2, IEC 63303, NUREG-0700, ASM, Hollifield, EEMUA 201, Rockwell, Few, Nubank, Android, Nielsen, Stripe, Vercel y Cognite) están citadas con su enlace en esos documentos; este no agrega ninguna afirmación externa nueva.

**El prototipo de las tres direcciones:** `docs/experiencia-v2/X1-prototipo/` (`direcciones.html`, `direcciones.css` y `tres-direcciones.png`).

**El demo** (servidor de desarrollo, `http://localhost:5173`, los mismos datos del demo de 4173, leídos el 25-oct; reloj del demo: 2-oct-2026, 14:00). Las rutas de donde salió cada cifra están en `imagenes/fuente/datos/datos-demo.json`:

- `#/ger/resumen/ceiba/curso` y `ceiba~portafolio`, `#/ger/riesgo/…` y `#/ger/diferidos/…`;
- `#/prod/planta/ceiba/curso` y `#/prod/produccion/ceiba/curso`;
- `#/sup/turno/ceiba/curso`, `#/oper/causa/ceiba/curso` y `#/tec/trabajo/ceiba/curso`;
- `#/conf/bombas/ceiba/curso/P-201B`, `#/jefe/riesgo/<campo>/curso` y `#/adm/planta/<campo>/curso`.

**Código leído, sin tocarlo:** `src/entities/equipos.ts` (las señales de P-201B y sus 12 lecturas), `src/entities/limites.ts` (las alarmas), `src/entities/roles.ts`, `src/widgets/diferidos/MesAMes.tsx`, `src/widgets/resumen/ResumenDirectivo.tsx` (la serie mes a mes, leída de sus `aria-label`), `src/widgets/PanelEquipo.tsx`, `src/shared/ui/Sparkline.tsx`, `src/shared/ui/Tip.tsx` y `e2e/auditoria/rutas.ts`.

**La medición propia:** `imagenes/fuente/datos/medicion-paleta.txt` (contraste y daltonismo, método de X1 §3.5), `medicion-color-en-pantalla.txt` (C3) y `c8-en-grises.png` (C8).

---

## 11. Resumen

1. **La mezcla, al pie de la letra del dueño:** todo se ve como B (papel, tarjetas sin borde, una cifra grande con su frase, píldoras, Air). La tubería de C va dentro de la tarjeta principal, en lugar de los 4 puntos, con el trazo claro de B. Los gráficos y las cifras de A (producción contra la meta, diferido por equipo, diferido por día mes a mes, antes · durante · después, indicadores analógicos y tendencias) se redibujan en tarjetas de B.
2. **Navegación:** la franja azul de B pasa a un panel lateral izquierdo índigo (240 px, plegable a 88), con las puertas de X4: Hoy · La planta viva · Equipos · Resultados. En el teléfono, el mismo panel se abre con el menú, sin barra abajo (decisión del dueño, con su costo en §9).
3. **Tokens:** el índigo #142d88 (blanco encima: 11,93:1); los neutros de B en claro y en oscuro (nunca negro); la paleta de estado de X2 exacta, con forma y palabra; Air de 12 a 80 px. **0 fallas** de contraste y ninguna pareja de estado bajo 10 con daltonismo.
4. **La tubería:** el contorno es lo que cabe, el núcleo es lo que pasa, y donde se trabó la pared se angosta y el hueco va rayado. «Limita» va en gris, una sola marca por equipo, y el ramal del agua vuelve al yacimiento.
5. **7 imágenes** con cifras del demo, en `docs/experiencia-v2/imagenes/`, que se regeneran con un guion.
6. **Revisión:** de las 44 comprobaciones, 36 pasan (6 después de corregir), 2 pasan a medias (el panel índigo contra C3, y el disparo que falta en el motor), 4 no se ven en una imagen y 2 son de proceso. En 10 segundos, la imagen 1 dice «se trabó en la planta de La Ceiba, por la bomba de agua P-201B».
