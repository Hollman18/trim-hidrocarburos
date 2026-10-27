# Tres direcciones visuales, sin el azul (§7)

**27-oct-2026 · M4.** Es el punto 3 de la puerta del dueño (§10). El dueño escoge una.

**Lo que sale:** el índigo `#142d88` como panel, botón, selección, foco y marca.
- Además de no gustarle al dueño, **no pasaba la regla nueva:** contra el morado de «sin comunicación», con protanopía, el índigo queda a **6,2** (pide 10 o más).

**Lo que no cambia en ninguna:** la paleta de estado de X2 §4.4, su forma, su palabra y sus 44 comprobaciones:
- rojo `#8b1a1a` / `#ff8080`, solo para el interlock;
- naranja `#bf4000` / `#ffb347` para la alarma;
- amarillo `#f9a825` con trazo `#1f2328` / `#fff176` para la atención y el aviso;
- morado `#8420a3` / `#c99cff` para «sin comunicación».

Cada dirección pone solo el marco:
- los fondos, la tinta y las líneas;
- el panel de navegación;
- **un acento** para la mano (el botón principal, lo seleccionado y el foco);
- la letra.

---

## 0. El resultado en una tabla

| | D1 · **Grafito** (recomendada) | D2 · **Consola blanca** | D3 · **Sala** |
|---|---|---|---|
| La idea | Papel gris frío, panel carbón y un acento petróleo que solo marca la mano | Blanco y línea fina; el acento es la tinta misma | Noche como tema principal, barra de condiciones arriba y un cian frío |
| Acento claro · noche | `#1d6768` · `#acd7dd` | `#15171a` · `#b4d5db` | `#017b80` · `#8edfd9` |
| Panel de navegación | carbón `#1e2125`, a la izquierda | blanco con línea de 1 px, a la izquierda | barra arriba (56 px) con la franja de condiciones |
| Bloques | por tono, radio 8, sin sombra | sin tarjetas: línea de 1 px y aire | marco de 1 px, radio 2 |
| Letra | **IBM Plex Sans** + Condensed + Mono (SIL OFL 1.1) | **Geist** + Geist Mono (SIL OFL 1.1) | **Air** + Air Condensed (licencia NO verificada) |
| Acento contra el estado más cercano, peor de 4 visiones (≥ 10) | **11,0** · **12,3** | **14,3** · **11,4** | **11,9** · **12,7** |
| Texto más claro (`tinta3`) en su peor fondo (≥ 4,5) | 5,69 · 5,47 | 5,67 · 5,89 | 5,59 · 5,26 |
| Fallas de la medición | 0 | 0 | 0 |

**Medición completa:** `herramientas/medicion-direcciones.txt` y `.json`. Se recalcula con `node docs/experiencia-v3/herramientas/medir-direcciones.mjs`, que sale con 1 si algo falla.

**Lámina para comparar las 3:** `imagenes/lamina-tres-direcciones.png`.

---

## 1. Cómo se midió

- **El método es el de X2 y X5:** `docs/experiencia-v2/imagenes/fuente/scripts/medir-paleta.mjs`, copiado sin cambios en `herramientas/medir-paleta-v2.mjs`.
  - El contraste es el de WCAG 2.2, con luminancia relativa.
  - La separación es en OKLab ×100, con visión normal y con la simulación de Machado, Oliveira y Fernandes (2009, severidad 1) para protanopía, deuteranopía y tritanopía.
- **El guion nuevo**, `herramientas/medir-direcciones.mjs`, usa las mismas funciones y mide cada dirección en sus dos temas:
  1. la tinta, la tinta 2 y la tinta 3: 4,5:1 o más sobre los 5 fondos (suelo, superficie, panel, panel2 y elevado);
  2. los grises de datos y el contorno de los equipos: 3:1 o más;
  3. cada color de estado: 3:1 o más sobre los 5 fondos. El amarillo del claro no llega, y lleva su trazo oscuro, como en X2;
  4. los 4 colores de estado entre sí: 10 o más en las 4 visiones (es la C7 de X2);
  5. **lo nuevo:** el acento contra cada color de estado, 10 o más en las 4 visiones;
  6. los pares propios de cada dirección:
     - el texto del botón sobre el acento;
     - el foco sobre el panel y el suelo;
     - los rótulos del panel de navegación y la raya de lo seleccionado;
     - la tinta sobre lo seleccionado y sobre los 3 tintes de estado;
     - el equipo en marcha contra el parado;
     - el puntero contra la banda;
     - la barra contra su pista.
- **Una sola fuente de tokens:** `herramientas/direcciones.json`. El guion la mide y escribe `imagenes/fuente/tokens.css`, que es lo que pintan las imágenes. Lo que se ve es lo que se midió.

### 1.1 Por qué el acento es petróleo o cian, y no otro color

La paleta de estado ocupa el rojo, el naranja, el amarillo y el morado. El encargo saca además el verde y el azul.

Busqué en todo el espacio OKLCH (`L` de 0,2 a 0,95, croma de 0 a 0,2, cada 2° de tono) el acento con la mayor separación del estado más cercano:
- **Fuera del eje cian-petróleo (tono 185°–205°) no queda ningún tono libre** que pase 10 con las 4 visiones y que no sea verde, azul, rosa o café. El café y el rosa son naranja y rojo oscurecidos: con deuteranopía se confunden con la alarma y el interlock.
- **El acromático pasa solo en claro.** El negro de D2 queda a 14,3. En noche, un acento blanco o gris claro no llega a 10 contra el amarillo con tritanopía: la tinta `#f4f4f5` queda a **4,9**, y el mejor gris posible, `#c7d0d2`, a 9,6. Por eso D2, en noche, lleva un hielo apenas teñido (`#b4d5db`, 11,4).

**Por eso las tres direcciones se distinguen por la estructura, la luz y la letra, más que por el tono del acento.**

---

## 2. D1 · Grafito (recomendada)

**La idea:** el producto se ve como un instrumento. Papel gris frío (no crema), una sola masa oscura, que es el panel carbón, y un acento petróleo sobrio que solo aparece donde la persona actúa: el botón principal, lo seleccionado y el foco. Los datos son grises, y el color, como siempre, es del estado.

### 2.1 Tokens

| Token | Claro | Noche | Para qué |
|---|---|---|---|
| `suelo` | `#e9eaec` | `#191b1e` | el fondo de la vista |
| `superficie` | `#f1f2f3` | `#1f2124` | |
| `panel` | `#f9f9fa` | `#25282c` | el bloque |
| `panel2` | `#eeeff1` | `#222428` | un bloque dentro de otro; el lienzo del esquema |
| `elevado` | `#ffffff` | `#2c2f34` | lo que flota; las opciones del operador |
| `tinta` · `tinta2` · `tinta3` | `#131518` · `#43474d` · `#565b62` | `#f1f2f3` · `#c5c9ce` · `#a0a6ad` | el texto |
| `linea` · `linea2` | `#d4d7db` · `#e2e4e7` | `#363a40` · `#2c2f34` | |
| `nav` | `#1e2125` | `#121416` | el panel de navegación (carbón en los dos temas) |
| `nav-tinta` · `nav-tinta2` | `#f3f4f5` · `#aeb3ba` | `#f1f2f3` · `#9da3aa` | el rótulo activo y el inactivo |
| `nav-activo` · `nav-marca` | `#2e3238` · `#f3f4f5` | `#25282c` · `#acd7dd` | lo seleccionado en el panel: el fondo y la raya de 3 px |
| **`acento`** | **`#1d6768`** | **`#acd7dd`** | el botón principal, lo seleccionado y el foco |
| `acento-sobre` | `#ffffff` | `#121416` | el texto del botón |
| `acento-suave` | `#dcebea` | `#22393c` | el fondo de lo seleccionado |
| `dato1` · `dato3` | `#33373c` · `#73787f` | `#d7dbdf` · `#868c94` | la barra y la línea que mandan; lo demás |
| `banda` · `pista` | `#ccd0d4` · `#dde0e3` | `#575b60` · `#33363b` | la banda normal; el riel del indicador |
| `eq-marcha` · `eq-parado` · `eq-trazo` | `#ffffff` · `#555a60` · `#555a60` | `#d7dbdf` · `#0e1012` · `#a7abb0` | el equipo por brillo (X2 §4.3) |

### 2.2 La medición

- **Texto:** tinta 15,19 · tinta2 7,76 · tinta3 5,69 en su peor fondo (claro); 11,98 · 8,07 · 5,47 (noche).
- **Estado:**
  - en claro: interlock 7,72, alarma 4,42, sin comunicación 6,42, y el amarillo lleva un trazo de 13,12;
  - en noche: 5,53 · 7,54 · 6,19, y el amarillo 11,58.
- **El acento contra cada estado** (normal · protan · deutan · tritan):

  | | Claro `#1d6768` | Noche `#acd7dd` |
  |---|---|---|
  | interlock | 22,45 · 16,92 · **10,95** · 25,86 | 22,69 · 20,11 · 13,09 · 27,28 |
  | alarma | 25,08 · 11,14 · 17,05 · 30,57 | 18,60 · 18,10 · 17,00 · 18,29 |
  | atención y aviso | 38,28 · 29,86 · 38,32 · 36,87 | 18,74 · 17,45 · 19,03 · **12,84** |
  | sin comunicación | 24,45 · 15,96 · 11,03 · 18,10 | 17,58 · 15,78 · 12,54 · **12,26** |

- **Pares:**
  - blanco sobre el botón: 6,58;
  - el foco: 6,25 sobre el panel y 5,46 sobre el suelo;
  - los rótulos del panel de navegación: 11,70 el activo y 7,66 el inactivo;
  - el equipo en marcha contra el parado: 6,96 (claro) y 13,70 (noche).
- **Lo que queda flojo, dicho:** con deuteranopía, el petróleo del claro queda a **1,2** del gris `tinta3`. Para alguien con esa visión, lo seleccionado no se distingue de un texto gris solo por el color. Por eso **lo seleccionado lleva siempre forma**: la raya de 3 px del panel, la raya de 3 px de la pestaña y el peso 600. Nunca es solo color, y así lo pide WCAG 1.4.1.

### 2.3 La letra: IBM Plex Sans

- **Familia:**
  - Plex Sans para el texto y las cifras;
  - Plex Sans Condensed para los rótulos en mayúsculas;
  - Plex Mono para los tags (`PI-2010`).
- **Licencia: SIL Open Font License 1.1.** La verifiqué en el repositorio de Google Fonts (`ofl/ibmplexsans/OFL.txt`, copiado en `imagenes/fuente/fuentes/`):
  - permite incrustarla en la web y en un PDF;
  - permite redistribuirla con el producto, incluido el paquete del demo.
  - El nombre «Plex» es reservado: si se modifica la fuente, el archivo cambia de nombre. Para producción, conviene tomar los WOFF2 sin modificar de la publicación de IBM (`github.com/IBM/plex`).
- **Cifras tabulares:** medidas en Chromium (`imagenes/fuente/scripts/probar-cifras.mjs`, resultado en `datos/cifras-tabulares.txt`). «1111111» y «0000000» miden lo mismo:
  - en Plex Sans, 168,0 px y 168,0 px, **sin pedirlo** (tabulares por defecto);
  - en la Condensed, 151,2 px y 151,2 px.
- **Por qué no Air:** su licencia para el autohospedaje, el paquete y el PDF sigue **NO VERIFICADA** (X1 §3.1). Plex quita ese riesgo, y su origen de ingeniería le sienta a una sala de control sin parecer un tablero genérico.

### 2.4 Lo que evita de §7

- **No es crema con terracota:** el papel es gris frío, y el acento, petróleo.
- **No es negro con verde ácido:** el panel es carbón, no negro, y el acento es apagado.
- **No lleva degradados.**
- **No todo es tarjeta igual:** el bloque se separa por tono (sin sombra), la cifra principal no lleva caja propia y las listas son filas con línea.

---

## 3. D2 · Consola blanca

**La idea:** la más parecida a una buena app de consumo. Todo blanco, línea de 1 px, sin tarjetas, y el acento es la tinta misma: un botón negro. En claro, ningún tono compite con el estado.

### 3.1 Tokens

| Token | Claro | Noche |
|---|---|---|
| `suelo` · `superficie` · `panel` · `panel2` · `elevado` | `#f5f6f6` · `#ffffff` · `#ffffff` · `#f3f4f5` · `#ffffff` | `#17181b` · `#1c1d20` · `#1f2023` · `#1a1b1e` · `#26272b` |
| `tinta` · `tinta2` · `tinta3` | `#0f1113` · `#464a50` · `#5c6168` | `#f4f4f5` · `#c6c8cc` · `#9fa3a9` |
| `linea` · `linea2` | `#dfe1e4` · `#eceef0` | `#303236` · `#26272b` |
| `nav` · `nav-tinta` · `nav-tinta2` · `nav-activo` · `nav-marca` | `#ffffff` · `#0f1113` · `#5c6168` · `#eff0f2` · `#15171a` | `#17181b` · `#f4f4f5` · `#9fa3a9` · `#26272b` · `#b4d5db` |
| **`acento`** · `acento-sobre` · `acento-suave` | **`#15171a`** · `#ffffff` · `#eceef0` | **`#b4d5db`** · `#17181b` · `#263236` |
| `dato1` · `dato3` · `banda` · `pista` | `#2f3338` · `#757a81` · `#d3d6d9` · `#e6e8ea` | `#d9dbde` · `#83878d` · `#4f5256` · `#2c2e32` |
| `eq-marcha` · `eq-parado` · `eq-trazo` | `#ffffff` · `#5c6168` · `#5c6168` | `#d9dbde` · `#0b0c0d` · `#a3a7ac` |

### 3.2 La medición

- **Texto:**
  - en claro: 17,18 · 8,09 · 5,67;
  - en noche: 13,57 · 8,91 · 5,89.
- **Estado:**
  - en claro: interlock 8,44, alarma 4,83, sin comunicación 7,02, y el trazo del amarillo 14,35;
  - en noche: 6,15 · 8,38 · 6,88, y el amarillo 12,86.
- **El acento contra el estado más cercano:**
  - **14,28** en claro: el interlock con protanopía;
  - **11,37** en noche: «sin comunicación» con tritanopía.
- **El acento contra el gris:** 28,6 en claro. Es la única dirección donde el color de lo seleccionado sí se distingue del texto gris con cualquier visión.

### 3.3 La letra: Geist

- **Familia:** Geist y Geist Mono.
- **Licencia: SIL OFL 1.1,** verificada en `ofl/geist/OFL.txt` de Google Fonts.
- **Cifras tabulares:** solo con `tnum`. Sin pedirlas son proporcionales («1111111» mide 97,5 px y «0000000», 188,0 px); con `font-variant-numeric: tabular-nums`, las dos miden 168,0 px. La regla `.tabular` de hoy lo cubre.

### 3.4 Por qué no es la recomendada

- **El blanco puro cansa** en turnos de 12 horas. ASM recomienda gris, no blanco (X1 §2.4; X2 §4.7).
- **Sin tarjetas, el bloque depende de líneas de 1 px,** y esas líneas se pierden al sol en el teléfono.
- **En noche deja de ser acromática** (§1.1).

---

## 4. D3 · Sala

**La idea:** la más «sala de control». La noche es el tema principal, la franja de condiciones vive siempre en la barra de arriba, los marcos son de 1 px con radio 2, y un cian frío marca la mano.

### 4.1 Tokens

| Token | Claro (oficina) | Noche (principal) |
|---|---|---|
| `suelo` · `superficie` · `panel` · `panel2` · `elevado` | `#e6e8ea` · `#eef0f1` · `#f7f8f9` · `#eceef0` · `#ffffff` | `#1c1f23` · `#22262a` · `#282c31` · `#25292e` · `#30353b` |
| `tinta` · `tinta2` · `tinta3` | `#121417` · `#42474d` · `#555b62` | `#eef1f3` · `#c3c9cf` · `#a2aab2` |
| `linea` · `linea2` | `#d2d6da` · `#e0e3e6` | `#3a4047` · `#30353b` |
| `nav` · `nav-tinta` · `nav-tinta2` · `nav-activo` · `nav-marca` | `#f7f8f9` · `#121417` · `#555b62` · `#e0e3e6` · `#017b80` | `#16181b` · `#eef1f3` · `#a2aab2` · `#282c31` · `#8edfd9` |
| **`acento`** · `acento-sobre` · `acento-suave` | **`#017b80`** · `#ffffff` · `#d8ecec` | **`#8edfd9`** · `#16181b` · `#20393a` |
| `dato1` · `dato3` · `banda` · `pista` | `#32373c` · `#72777e` · `#cbcfd3` · `#dcdfe2` | `#d6dbe0` · `#89919a` · `#596068` · `#363b41` |
| `eq-marcha` · `eq-parado` · `eq-trazo` | `#ffffff` · `#545a60` · `#545a60` | `#d6dbe0` · `#0f1113` · `#a9b0b7` |

### 4.2 La medición

- **Texto:**
  - en claro: 15,02 · 7,63 · 5,59;
  - en noche: 10,90 · 7,41 · 5,26.
- **Estado:**
  - en noche: interlock 5,09, alarma 6,94 y sin comunicación 5,70;
  - en claro: la alarma da 4,33.
- **El acento contra el estado más cercano:**
  - **11,91** en claro: «sin comunicación» con deuteranopía;
  - **12,71** en noche: el interlock con deuteranopía.
- **El botón:** blanco sobre `#017b80`, **5,06**. Pasa, pero es el más justo de las tres.

### 4.3 La letra: Air

- **Familia:** Air y Air Condensed, la letra de hoy.
- **Licencia: NO VERIFICADA** para el autohospedaje y el PDF (X1 §3.1).
- **Cifras tabulares:**
  - Air, con `tnum`: 168,0 px y 168,0 px;
  - **Air Condensed, con `tnum`: 148,4 px contra 148,1 px.** No es exactamente tabular. Una columna de cifras condensadas se corre 0,3 px cada 7 dígitos.

### 4.4 Por qué no es la recomendada

- **La noche como tema principal contradice a ASM y a X2 §4.7:** el claro va por defecto en sala, oficina y campo, y la noche es una opción de la persona.
- **La licencia de Air sigue sin verificar.**
- **Su estructura sí sirve:** la franja de condiciones siempre arriba y el marco de 1 px. Si el dueño la prefiere, se puede pedir D1 con la barra de D3.

---

## 5. La recomendación: D1 · Grafito

1. **Es la que mejor convive con ISA-101 y ASM.** Gris claro por defecto y una sola masa oscura: el panel, que es navegación y nunca dato. El color queda, de verdad, para lo anormal.
2. **Contemporánea sin ser de moda.** No es crema, no es negro con verde y no es todo tarjetas iguales. El petróleo es sobrio y del mundo del producto (el agua y el crudo), sin ser el azul que salió.
3. **Quita un riesgo legal.** IBM Plex es OFL 1.1, con cifras tabulares por defecto y una condensada y una mono de la misma familia, que es lo que piden los tags y los rótulos de un HMI.
4. **Pasa todo con margen.** El peor caso del acento es 10,95 en claro y 12,26 en noche. Lo flojo está dicho (el petróleo cerca del gris con deuteranopía) y tiene su remedio de forma, que ya está en el sistema.

**Si el dueño quiere más «app de consumo»:** se toma de D2 la fila sin tarjeta, con línea fina, para las listas, y se deja el papel gris de D1.

---

## 6. Las imágenes

Todas están en `docs/experiencia-v3/imagenes/`, renderizadas desde HTML propio con el Playwright de `node_modules` (`fuente/scripts/renderizar-todo.sh` → `fuente/scripts/lote.mjs`). La fuente está en `imagenes/fuente/`.

**El contenido es LO NECESARIO de M1** (`necesario-por-rol.md`):
- gerente: **2.650 bbl/d** se dejan de producir ahora;
- supervisor: **4** paradas por confirmar;
- operador: pregunta **1 de 4**;
- jefe: **1** equipo avisa (K-101), con «**7,7 de 8,1** días son espera» de apoyo;
- producción: **9.394 de 11.857 bbl/d** salen hoy;
- regulatorio: **2** paradas sin causa;
- el nivel 3 de P-201B.

**Las cifras se leyeron del motor del demo**, por la costura (`src/shared/api`), en mi servidor `npx vite --port 5183`, ya apagado por su PID:
- los guiones son `fuente/scripts/leer-*.mjs`;
- los datos crudos, `fuente/datos/*.json`;
- y lo que pintan las imágenes, `fuente/datos/cifras.js`.

**Lo que el motor no calcula dice «sin registro» y lleva la marca «falta en el motor»:**
- la pérdida;
- registrar una pérdida;
- la respuesta de la ANH.

**Por dirección** (`d1-grafito`, `d2-consola-blanca`, `d3-sala`), en claro, a 1440 × 900 y a 390 × 844:
- `<dir>-ger-escritorio-claro.png` y `<dir>-ger-telefono-claro.png`;
- `<dir>-sup-…`, `<dir>-oper-…` y `<dir>-jefe-…`;
- `<dir>-p201b-escritorio-claro.png`: el nivel 3 con el kit SCADA;
- `<dir>-ger-escritorio-noche.png`.

**Solo en la recomendada (Grafito):**
- `d1-grafito-prod-escritorio-claro.png` y `d1-grafito-prod-telefono-claro.png`;
- `d1-grafito-reg-escritorio-claro.png` y `d1-grafito-reg-telefono-claro.png`;
- **las dos variantes del gerente que decide el dueño:**
  - sin el control Antes · Durante · Después: `d1-grafito-ger-escritorio-claro.png` y `d1-grafito-ger-telefono-claro.png`. Es lo que propone M1;
  - con el control: `d1-grafito-ger-momentos-escritorio-claro.png` y `d1-grafito-ger-momentos-telefono-claro.png`. El control lleva el número de cada momento (8 equipos avisan · 2.650 bbl/d · 2.376 bbl), sin los dígitos 1·2·3, que son de las prioridades;
- `d1-grafito-p201b-escritorio-noche.png`.

**Las láminas:**
- `lamina-tres-direcciones.png`: las 3 lado a lado, con sus tokens, su letra, su medición y su porqué;
- `lamina-kit-scada.png`: el kit (`kit-scada.md`).

**La auditoría de cada imagen** está en `fuente/datos/revision/` y en su resumen, `resumen.json`. En las 37 imágenes de pantalla:
- 0 errores;
- 0 textos de menos de 12 px (salvo el número dentro de una marca, que es parte del símbolo);
- 0 textos que se pisan;
- 1 cifra de 32 px o más;
- como mucho 4 cifras entre 20 y 31 px (X2, T1).

### 6.1 Lo que se ve en las imágenes y decidí yo (para que M1 y el coordinador lo revisen)

- **Sin menú los roles de una sola pantalla:** sup, oper y reg. Llevan una barra arriba con el campo, la franja y sus iniciales (§9.4).
- **Las puertas:**
  - ger: Inicio · Resultados;
  - jefe: Hoy · Equipos;
  - prod: Hoy · Resultados.
  - Son 2, como cuenta M1 en §13. Los nombres son míos.
- **El supervisor ve «El agua, ahora»:** el indicador del tanque (LT-2012, 89,6 %, alto-alto 90 %) y el orden de cierre.
  - Es el «TIENE» de M1: «el orden de cierre, solo cuando para una bomba de agua».
  - P-201B, que es una bomba de agua, está parada en el demo, así que es su momento.
- **El jefe ve «Por qué avisa»:** el indicador y la tendencia de 12 d de PT-1011, la presión de cabezal de K-101: **112 psi, fuera de la banda de 115 a 130**, según el motor (`pedirNivelEquipo('ceiba','K-101')`).
  - Es el kit donde agrega valor: muestra por qué el número principal es 1.
- **El gerente ve una barra contra su referencia en cada apoyo:**
  - el diferido contra el máximo a la fecha, 3.642 (`resultados().cifra.maximo`);
  - la producción contra la meta;
  - el cierre proyectado con solo contorno y la palabra «proyectado» (X2 §5.2), más chico que lo medido.
