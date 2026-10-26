# X3 · La base técnica: qué librerías sí, cuáles no y por qué

**25-oct-2026 · X3, ingeniero de diseño.** Leí `BRIEF.md` y los archivos de X1, X2 y X4 que ya estaban en la carpeta. Todo lo que se afirma de una librería se probó en un banco aparte o lleva su fuente. Lo que no se pudo verificar dice **NO VERIFICADO**.

## La respuesta corta

- **La planta viva, la tubería y los esquemas: SVG propio en React, como hoy.** Es el que mejor salió en todas las pruebas: el más liviano (+3 a +17 KB gzip), el más rápido con datos en vivo, el único limpio en el auditor a los 5 anchos, accesible por teclado sin pegamento y con el texto real en el PDF. Como ayuda opcional para las curvas del tubo, **`d3-shape`** (ISC, 2,2 KB gzip), que solo calcula trazos y no toca el DOM.
- **Los indicadores (el analógico, la barra contra la meta): SVG y HTML propios**, ajustados a X2 §5.1. Ninguna librería de gráficos trae el indicador de alto desempeño; todas obligan a dibujarlo a mano.
- **Las tendencias: SVG propio mientras sean cortas (como hoy).** Si un rol técnico necesita tendencias densas en vivo, **uPlot** (MIT, 22 KB gzip), en su propio trozo y con su tabla equivalente.
- **Componentes base: ninguno por ahora.** Si la arquitectura nueva de X4 trae menús, pestañas o buscadores con teclado, **React Aria Components** (Apache-2.0, Adobe). **Base UI** (MIT) es la alternativa igual de válida.
- **Movimiento: ninguna librería.** Las transiciones de navegación con la **View Transitions API** del navegador y `<ViewTransition>` de React 19.3, que ya es estable y no pesa nada. Se apagan con `prefers-reduced-motion`.
- **Íconos: lucide, que ya está.** Los símbolos de proceso siguen siendo SVG propios (`Simbolos.tsx`), con ISA-5.1 como referencia de dibujo.
- **Se descartan** React Flow, ECharts, Recharts, Nivo, Victory, Tremor, JointJS, GoJS, Rete, maxGraph, Motion, Phosphor y Headless UI. Las razones están en §5.2. **Todas** pasaron la CSP sin `eval`: ninguna se descarta por eso.

## Índice

1. [Cómo se evaluó](#1-cómo-se-evaluó)
2. [El prototipo: la tubería del campo y el indicador analógico](#2-el-prototipo-la-tubería-del-campo-y-el-indicador-analógico)
3. [Lo que dijo la prueba de verdad](#3-lo-que-dijo-la-prueba-de-verdad)
4. [Cada familia, criterio por criterio](#4-cada-familia-criterio-por-criterio)
5. [Recomendación](#5-recomendación)
6. [Desacuerdos](#6-desacuerdos)
7. [Fuentes](#7-fuentes)
8. [Resumen](#8-resumen)

---

## 1. Cómo se evaluó

### 1.1 El banco de pruebas

Todo se hizo fuera del repositorio, sin `npm i` adentro, en un proyecto Vite + React aparte:

- **Proyecto:** `/private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/ux/x3/proto`
- **Resultados** (capturas, PDF, JSON de cada medición): `/private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/ux/x3/resultados`
- Ojo: es la carpeta temporal de esta sesión. Si se limpia, el método de abajo alcanza para repetirlo.
- **Para repetirlo:** `./reconstruir.sh` construye y levanta el servidor en `127.0.0.1:4299`. Después, `node pruebas/ver.mjs svg rf ec` y los demás scripts de `pruebas/`. **Durante esta sesión el banco usó el puerto 4199, que es el del proyecto «demo» de Playwright del repo** (`TRIM_PUERTO_DEMO` en `playwright.config.ts`). Si alguien corrió las e2e en ese rato, pudieron chocar. Ya quedó libre, y el banco pasó al 4299.

**Mismas versiones que el repo** (las instaladas en `node_modules`, no solo las de `package.json`): React 19.3.0, Vite 8.3.2, TypeScript 6.0.3, Tailwind 4.3.3, `@vitejs/plugin-react` 6.1.1 y Playwright 1.63.0. El `tsconfig` copia las opciones estrictas de `tsconfig.app.json`: `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `verbatimModuleSyntax`, `erasableSyntaxOnly` y las demás. **Las 28 páginas del banco compilan con `tsc -b` sin errores.**

### 1.2 La CSP, idéntica a la del demo

- `demo/cabeceras.mjs` se copió **byte a byte**. El sha-256 de los dos archivos es el mismo: `8b13d1bb20c9155d33546d63838a23db716b37cf04c2aa08fb30cba66a5e8228`.
- Un servidor igual a `demo/servidor.mjs` (solo cambia que sirve `dist/` y varias páginas) manda la política como **cabecera**. Un plugin igual a `trim-csp` la pone además como **`<meta>`** en cada HTML construido.
- Cada página lleva **el mismo script en línea de `index.html`** (el que estampa el tema), así que la política incluye su huella sha-256, como en el producto: `script-src 'self' 'sha256-…'`, sin `unsafe-eval`.
- **El control:** una página «canario» llama a `eval` y a `new Function` a propósito. El banco vio **4 violaciones** y las dos llamadas fallaron con `EvalError`. Así consta que el banco detecta lo que la política bloquea; un banco que no ve nada no prueba nada.

### 1.3 Qué se midió en cada página

Con Playwright 1.63 en Chromium, servido con la CSP:

| Medida | Cómo |
|---|---|
| **Violaciones de la CSP** | El evento `securitypolicyviolation` en la página, más los errores de consola y las excepciones. Se cuentan también durante la actualización en vivo, no solo al cargar |
| **Que dibujó de verdad** | Cada página avisa al terminar (`window.__x3.listo`) y cuenta lo dibujado: diálogos abiertos, nodos, `<svg>`, `<canvas>` y `<text>`. Además se tomaron capturas y **se miraron todas**. Una cifra de rendimiento resultó ser de un gráfico en blanco (§3.3) |
| **Capturas** | 1280 px y 390 px (táctil, `isMobile`), claro y oscuro, y el tema cambiado **con la página abierta** |
| **El auditor del repo** | `e2e/auditoria/detector.ts` **leído y transpilado tal cual**, en los 5 anchos del auditor (1512, 1280, 1024, 768 y 390) |
| **Impresión** | `page.pdf()` en A4 con `print` emulado; después `pdftotext` para ver si el texto del dibujo es texto real |
| **Teclado y lector** | El árbol ARIA (`ariaSnapshot`), el recorrido con Tab y si Enter abre el detalle de un tramo |
| **Teléfono táctil** | Un gesto real de dedo con DevTools (`Input.synthesizeScrollGesture`) **encima del dibujo**: ¿se desplaza la página? |
| **Rendimiento** | Ver §3.3. La CPU se frena 4× con DevTools para parecerse a un teléfono de gama media; también se midió sin freno |
| **Peso** | Dos formas: esbuild (minificado, con *tree-shaking* y React por fuera) y el build real de Vite 8 contra una página base que solo trae React |

**Lo que NO se probó**, y queda **NO VERIFICADO**: Safari (WebKit) y Firefox (solo Chromium), teléfonos físicos y lectores de pantalla reales (solo se revisó el árbol ARIA que leen).

---

## 2. El prototipo: la tubería del campo y el indicador analógico

### 2.1 Qué se armó

**La tubería de La Ceiba como flujo de proceso**, con los números de U2 §2.2 tal cual (el prototipo no calcula nada: pinta lo que el motor le daría hecho):

- **yacimiento** (sombreado, sin número) → **pozos** 11.360 bbl/d, **◄ LIMITA** → **planta** 12.000 bbl/d, con sus tres carriles (crudo 12.000, el menor; agua ≈ 13.574, con la raya de «hoy, sin P-201B»; gas sin medir, punteado) → **afuera** 14.000 → venta;
- **lo que pasa hoy**, 9.394 bbl/d, como una banda oscura del mismo grosor en todos los tramos;
- **el tramo que limita** con doble contorno y la palabra, **nunca en rojo** (U2 §2.3);
- **lo que se deja de producir en un tramo**: 1.665 bbl/d en la planta por **◆1 P-201B parada**. La marca de prioridad del equipo es el único color del dibujo;
- **«sin identificar»** (LC-21, 301 bbl/d) aparte, punteado, sin repartirse entre los tramos (U2 §0, principio 5);
- en el teléfono, **la tubería de pie** (U2 §2.6).

**Una corrección a mitad de camino.** La primera versión dibujó los 1.665 bbl/d como una **fuga** que salía de la planta. Al leer X4 §4.2 se cambió: el diferido es **un hueco rayado dentro del tramo** donde se trabó, pegado a lo que pasa, con una línea guía fina hasta su rótulo. La gota queda reservada para la **pérdida** de verdad, el crudo que salió y se regó. Edinson lo definió así en la reunión que cita X4: la diferida «todavía está en subsuelo» y la pérdida es «un derramamiento de fluidos». X4 saca la consecuencia: «si el diferido se pintara como goteo, el gerente vería derrames donde no los hay». Este cambio pesa también en la elección de la librería (§3.8).

**El indicador analógico de alto desempeño**, como lo fija X2 §5.1. El primero es su mismo ejemplo: presión de succión PI-2011 en 8,8 psi, con disparo en 8 (raya doble y candado), alarma en 10, banda normal de 12 a 20 y alarma en 24. Los otros casos:

- la banda normal se ve siempre, con una raya fina en cada extremo;
- **el puntero va siempre en tinta**; el color va solo en la marca de prioridad, a la izquierda del valor, que va en negrita;
- un valor fuera de escala deja el puntero en el borde con ►;
- **sin comunicación**: escala punteada morada, sin puntero, «---» y «sin comunicación desde 14:07»;
- el nivel del tanque de pie, contra su alto-alto, con el aviso «sube: P-201B parada».

### 2.2 Con qué librerías

Las tres mejores candidatas que salieron de §4, cada una en su página:

| Página | Librería | Cómo se dibujó |
|---|---|---|
| `rf.html` | **React Flow 12.12** (`@xyflow/react`, MIT) | Cada tramo es un **nodo** HTML con Tailwind; cada tubo, una **arista** SVG; la disposición acostada o de pie se calcula según el ancho del contenedor. Paneo, zoom, arrastre y selección apagados: es un dibujo fijo |
| `svg.html` | **SVG propio + `d3-shape` + `d3-scale`** (ISC) | Un solo `<svg>`. La **pared del tubo** se dibuja con `d3.area` y `curveBumpX`, así que entre un tramo y otro hay una **reducción suave**: donde el tubo es más angosto está lo que limita. React pinta; d3 solo calcula el trazo |
| `ec.html` | **Apache ECharts 6.1** (Apache-2.0), importación modular | La misma pregunta como **Sankey** («dónde se deja de producir»: el ancho de cada banda es lo que corre por ahí). El indicador, como serie `custom` con primitivas de zrender. Se probó con el renderizador **SVG** (`ec.html`) y con **canvas** (`ec.html?r=canvas`) |

Los tres llevan **el mismo indicador analógico**. En React Flow y en SVG propio es el SVG propio, porque ninguna de las dos trae uno. En ECharts se rehízo como serie `custom`.

**Capturas** (todas en `/private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/ux/x3/resultados/capturas/`):

| Qué | Archivo |
|---|---|
| SVG propio, escritorio y teléfono, claro y oscuro | `svg-escritorio-claro.png`, `svg-telefono-claro.png`, `svg-escritorio-oscuro.png`, `svg-telefono-oscuro.png` |
| React Flow, igual | `rf-escritorio-claro.png`, `rf-telefono-claro.png`, `rf-escritorio-oscuro.png`, `rf-telefono-oscuro.png` |
| ECharts SVG y canvas | `ec-escritorio-claro.png`, `ec-telefono-claro.png`, `ec_r_canvas-escritorio-oscuro.png` |
| ECharts con las variables CSS pasadas tal cual | `ec_vars_1-escritorio-claro.png` (SVG), `ec_r_canvas_vars_1-escritorio-claro.png` (canvas) |
| El tema cambiado con la página abierta | `rf-tema-en-caliente.png`, `svg-tema-en-caliente.png`, `ec-tema-en-caliente.png`, `ec_r_canvas-tema-en-caliente.png` |
| GoJS sin licencia (la marca de agua) y Rete | `sonda-gojs.png`, `sonda-rete.png` |
| Tendencias en vivo | `tend-uplot.png`, `tend-ec-dataset.png`, `tend-ec-canvas-lttb.png` |
| Los PDF | `../pdf/rf.pdf`, `../pdf/svg.pdf`, `../pdf/ec.pdf`, `../pdf/ec_r_canvas.pdf` |

---

## 3. Lo que dijo la prueba de verdad

### 3.1 La CSP sin `eval`: todas pasan

Cada librería se montó en una página mínima, servida con la política del demo, y se hizo trabajar: abrir un diálogo, animar, dibujar y actualizar en vivo. **Resultado: 0 violaciones y 0 errores en todas**, también durante las actualizaciones en vivo. El canario, en cambio, dio 4 (§1.2).

| Librería (versión probada) | Violaciones CSP | Errores | Qué hizo la sonda | Lo que se ve en su código, y por qué no estalla |
|---|---|---|---|---|
| React Flow `@xyflow/react` 12.12.0 | 0 | 0 | La tubería, más 60 y 150 pozos en vivo | Limpio |
| d3-shape 3.2.0 · d3-scale 4.0.2 · d3-sankey 0.12.3 | 0 | 0 | La tubería y 60 pozos en vivo | Limpio |
| ECharts 6.1.0, modular y **completo** | 0 | 0 | Sankey, `custom`, gauge, graph y líneas, en SVG y en canvas | El paquete completo trae `new Function('return (' + source + ')')`, pero solo como respaldo para leer GeoJSON **cuando el navegador no tiene `JSON.parse`** (`lib/coord/geo/GeoJSONResource.js:143`). Ese camino no se toca. La importación modular no lo incluye |
| uPlot 1.6.32 | 0 | 0 | 12 series × 1.800 puntos en vivo | Limpio |
| Recharts 3.10.1 | 0 | 0 | La misma tendencia | Solo su build UMD trae `new Function("return this")`; el de módulos que usa Vite no |
| visx 4.0.0 | 0 | 0 | La misma tendencia | Limpio |
| Nivo 0.99.0 (Sankey) | 0 | 0 | Un Sankey | Limpio |
| Victory 37.3.6 | 0 | 0 | Una línea con ejes | Su `dist/` UMD trae `Function('return this')` de webpack y de lodash; no es lo que se importa |
| JointJS `@joint/core` 4.3.3 | 0 | 0 | Dos cajas y un enlace | `Function('return this')` de un polyfill de core-js, que solo corre si no existe `globalThis` |
| GoJS 4.0.5 | 0 | 0 | Dos nodos y un enlace (con marca de agua) | Limpio |
| Rete.js 2.0.6 + react-plugin 2.1.2 | 0 | 0 | Dos nodos conectados | El mismo polyfill, inalcanzable. Su tema por defecto **inyecta `<style>`** (styled-components): la política lo deja pasar por `'unsafe-inline'` en `style-src` |
| maxGraph 0.25.1 | 0 | 0 | Dos vértices y una arista | **Tiene `eval`** (`internal/utils.js`, `doEval`), pero solo para convertir un nombre de estilo que no esté registrado, y detrás de `allowEval`, que **viene en `false`** en `GraphView`, `ObjectCodec` y `StylesheetCodec`. Si alguien lo prende, la CSP lo bloquea. Y el build de Vite 8 lo avisa: rolldown marca «Use of direct `eval`» |
| Radix (`radix-ui` 1.8.1) | 0 | 0 | Dialog, Tooltip y Popover abiertos | Limpio |
| React Aria Components 1.22.1 | 0 | 0 | Dialog, Tooltip y **Meter** (`role="meter"`) | Limpio |
| Ark UI 5.39.3 | 0 | 0 | Dialog | Limpio |
| Headless UI 2.2.10 | 0 | 0 | Dialog | Limpio |
| Base UI 1.9.0 | 0 | 0 | Dialog y **Meter** (`role="meter"`) | Limpio |
| Motion 14.6.0 | 0 | 0 | `animate`, `layout` y `AnimatePresence` | Limpio |
| auto-animate 0.10.0 | 0 | 0 | Una lista que cambia | Limpio |
| View Transitions (navegador) y `<ViewTransition>` de React 19.3 | 0 | 0 | Un cambio de vista | Nativo, sin código de terceros |
| lucide-react 1.61.0 · Phosphor 2.1.10 | 0 | 0 | Íconos | Limpio |

**Conclusión:** la CSP no descarta a ninguna. Lo que sí hay que vigilar:

1. **`style-src 'unsafe-inline'` tiene que quedarse.** Todas las librerías de React escriben atributos `style` (React Flow posiciona cada nodo así), y Rete inyecta etiquetas `<style>`. El repo ya lo permite por el membrete del informe (`cabeceras.mjs`).
2. **maxGraph y el paquete completo de ECharts traen código con `eval`**, aunque no se use. Una revisión de seguridad lo va a encontrar y habrá que explicarlo. Con las demás no pasa.

Detalle de cada corrida: `resultados/ver-sondas.json` y `resultados/ver-ultimo.json`.

### 3.2 SVG o canvas: lo que el auditor y el PDF pueden leer

| | SVG propio | React Flow | ECharts con SVG | ECharts con canvas |
|---|---|---|---|---|
| Textos del dibujo que el auditor lee (`<text>` o HTML) | 35 | todo es HTML | 32 | **0** |
| Hallazgos del auditor del repo, a 1512 · 1280 · 1024 · 768 · 390 px | **0 · 0 · 0 · 0 · 0** | 1 · 1 · 1 · 0 · 1 | 0 · 0 · 0 · 0 · 1 | 0 · 0 · 0 · 0 · 0, **porque no ve nada** |
| Texto del dibujo en el PDF (`pdftotext`) | Sí | Sí | Sí | **No: sale como imagen** |
| Se imprime | Sí, vectorial | Sí | Sí, vectorial | Sí, como mapa de bits |

Lo que significa cada fila:

- **React Flow tiene un falso positivo fijo.** El `div` de su *viewport* mide el 100 % del panel y se traslada con `transform`, así que para el auditor siempre «se sale» de su caja (`recortado`, de 8 a 89 px según el ancho). Adoptarlo obliga a poner una excepción para `.react-flow__viewport` en `detector.ts`.
- **ECharts con SVG en 390 px tuvo rótulos encimados** en su Sankey de pie, y el auditor los marcó (`encimado`). Su acomodo automático de rótulos no alcanzó en un ancho de teléfono, ni después de dos ajustes de márgenes.
- **El canvas deja ciego al auditor y al PDF.** Que dé 0 hallazgos no es bueno: es que no puede mirar. En el PDF, las cifras del dibujo no se pueden buscar ni copiar, y el informe de TRIM lleva folio y huella para que lo lea un tercero.

**Un hueco del auditor que encontró esta prueba.** El detector de hoy usa los `<text>` de un SVG solo para buscar encimados. **Un texto que se sale del borde de su `<svg>` y queda cortado no lo ve.** El SVG recorta por defecto, así que la parte de afuera simplemente no se pinta. En el Sankey de ECharts a 390 px había 5 rótulos cortados («PERDIÉNDOSE · EN LA PLANTA», «SIN IDENTIFICAR»… en la primera versión) y el auditor dio 0. Con una regla nueva de 12 líneas (`pruebas/texto-svg.mjs` del banco) aparecieron los 5. **Vale también para los SVG que ya tiene el repo.** La regla va en §5.5.

**Y atrapó un error mío.** En la versión final del indicador, la flecha ► de «fuera de escala» quedó 17 px por fuera de su `<svg>`, y a 390 px se salía 4 px de la tarjeta. La regla nueva la marcó en los 5 anchos y el auditor de hoy, a 390. Se movió adentro de la escala y los dos volvieron a 0. Es el argumento a favor del SVG: **lo que se rompe, el auditor lo ve**.

### 3.3 Rendimiento con datos en vivo

**Cómo se midió.** Cada página recibe datos simulados y cada pozo se mueve un poco en cada paso. Hay dos escenarios:

- **real**: una actualización cada 2 s durante 20 s;
- **exigido**: una cada 250 ms durante 10 s.

Los dos se corrieron con la CPU frenada 4× (como un teléfono de gama media) y, el exigido, también sin freno. Se mide:

- **ms por actualización**: el costo síncrono de cada cambio (estado, dibujo de la librería y cálculo de estilos y posiciones). Se da la mediana;
- **hilo principal**: el % del tiempo de reloj que estuvo ocupado, medido con DevTools. Incluye pintar;
- **tareas largas**: las de más de 50 ms. Cada una es un momento en que la pantalla no responde al dedo.

La corrida final se hizo con la máquina sin otra carga (`resultados/rendimiento-final60.json`, `-final150.json` y `-final-ecmodos.json`). Con solo 10 actualizaciones en el escenario real, las medianas varían de una corrida a otra: en dos corridas, visx dio 23 y 40 ms. Lo que sirve es el orden de magnitud y las tareas largas.

**La planta en vivo: 60 pozos** (cada uno con su caudal y un indicador de presión) → múltiple → planta:

| | Real, CPU 4×: ms · hilo · tareas largas | Exigido, CPU 4× | Exigido, sin freno | Nodos del DOM |
|---|---|---|---|---|
| **SVG propio** | **8,2 ms · 0,6 % · 0** | **7,2 ms · 3,9 % · 0** | **1,7 ms · 0,9 %** | **656** |
| React Flow | 19,5 ms · 2,4 % · 0 | 17,0 ms · 17,9 % · 0 | 3,9 ms · 4,0 % | 2.300 a 3.800 |
| ECharts, SVG | 20,5 ms · 1,4 % · 0 | 15,5 ms · 8,4 % · 0 | 9,9 ms · 5,4 % | 1.100 a 3.100 |
| ECharts, canvas | 22,6 ms · 1,6 % · 0 | 14,3 ms · 7,9 % · 0 | 3,3 ms · 2,1 % | 54 |

**La misma planta con 150 pozos:**

| | Real, CPU 4× | Exigido, CPU 4× | Exigido, sin freno |
|---|---|---|---|
| **SVG propio** | **19,1 ms · 1,4 % · 0** | **15,7 ms · 7,6 % · 0** | **3,8 ms · 2,1 %** |
| React Flow | 54,4 ms · 6,1 % · **13 tareas largas** (la peor, 83 ms) | 29,7 ms · **32,7 %** · 14 | 8,3 ms · 10 % |
| ECharts, SVG | 46,2 ms · 3,0 % · 4 (68 ms) | 29,6 ms · 15,7 % · 0 | 7,8 ms · 4,5 % |
| ECharts, canvas | 38,2 ms · 2,3 % · 2 (52 ms) | 29,1 ms · 13,4 % · 0 | 7,4 ms · 3,9 % |

**Tendencias en vivo: 12 series × 1.800 puntos** (una hora con un dato cada 2 s), con un punto nuevo por serie en cada paso:

| | Real, CPU 4× | Exigido, CPU 4× | Exigido, sin freno |
|---|---|---|---|
| **uPlot** (canvas) | **7,3 ms · 0,4 % · 0** | **4,5 ms · 2,1 % · 0** | **1,2 ms · 0,6 %** |
| visx (SVG por React) | 40,3 ms · 2,0 % · 2 | 23,4 ms · 10,7 % · 0 | 7,0 ms · 3,8 % |
| ECharts con `dataset`, canvas | 31,2 ms · 2,2 % · 1 | 27,3 ms · 12,4 % · 0 | 7,0 ms · 3,9 % |
| ECharts con `dataset`, SVG | 43,2 ms · 3,0 % · 2 | 37,8 ms · 17,2 % · 0 | 9,0 ms · 4,5 % |
| ECharts, canvas con muestreo LTTB | 45,7 ms · 3,0 % · 3 | 23,5 ms · 10,7 % · 0 | 6,7 ms · 3,7 % |
| ECharts con pares `[t, v]` (la forma más común) | 68 a 72 ms · 4–5 % · **9 a 10** | 54 a 56 ms · **27 %** · 27 | 12 a 14 ms · 7–8 % |
| **Recharts** | **274 ms** · 14,9 % · **10** (la peor, 421 ms) | **225 ms · 93,8 %** · 39 | 61 ms · 27,9 % · **40** |

**Lo que dicen las tablas:**

1. **Con «decenas de pozos cada pocos segundos», todas las candidatas aguantan**: ninguna pasa del 2,5 % del hilo principal en el escenario real con 60 pozos. El rendimiento no decide entre ellas a esa escala; deciden los demás criterios.
2. **SVG propio cuesta menos de la mitad** que React Flow o ECharts por actualización, con 3 a 6 veces menos DOM que React Flow. **Con 150 pozos es el único sin tareas largas**: React Flow deja la pantalla trabada 13 veces en 20 s con la CPU de un teléfono.
3. **Para tendencias densas, uPlot no tiene rival**: de 4 a 6 veces más barato que visx y ECharts, y unas 40 veces más que Recharts. **Recharts no sirve para eso**: con una actualización cada 250 ms ocupa el 94 % del hilo, y la pantalla deja de responder.
4. **ECharts depende de cómo se le pasen los datos**: con `dataset` cuesta entre la mitad y dos tercios de lo que cuesta con pares. **La primera medición con `dataset` dio 12 ms, y era falsa**: en la importación modular falta registrar `DatasetComponent`, y **la versión de producción no avisa: deja el gráfico en blanco** (`tend-ec-dataset.png` antes del arreglo). Se vio al mirar la captura, no en las cifras.
5. Todas las corridas, también las exigidas, terminaron con **0 violaciones de CSP y 0 errores**.

### 3.4 En el teléfono

| A 390 px, táctil | SVG propio | React Flow | ECharts con SVG | ECharts con canvas |
|---|---|---|---|---|
| Disposición de pie, sin desplazamiento lateral | Sí | Sí | Sí (Sankey vertical) | Sí |
| Textos cortados o encimados | 0 | 0 (más el falso positivo de §3.2) | 1 encimado, y 5 cortados antes de ajustar márgenes | No se puede saber |
| **Con el dedo encima del dibujo, ¿se desplaza la página?** (gesto de 400 px) | **401 px** | **0 px de fábrica**; unos 400 con una línea de CSS | Sí (302 px: el tope de esa página) | Sí |

**React Flow se traga el gesto.** Aunque el paneo, el zoom y `preventScrolling` estén apagados, su hoja base pone `touch-action: none` en el panel (`@xyflow/react/dist/base.css`, regla `.react-flow__pane`). En el teléfono, la tubería de pie ocupa más de una pantalla, así que el usuario quedaría **atascado con el dedo sobre el dibujo**. Se arregla con `.react-flow__pane { touch-action: pan-y; }`, y quedó probado. Es el tipo de detalle que obliga a pelear con una librería pensada para editar grafos, no para mostrar un proceso.

### 3.5 Teclado y lector de pantalla

| | SVG propio | React Flow de fábrica | React Flow configurado | ECharts con SVG | ECharts con canvas |
|---|---|---|---|---|---|
| Paradas de Tab dentro del dibujo | **5**: los 4 tramos y «sin identificar» | 5 **aristas** («Edge from reservorio to pozo», en inglés), 7 nodos (también la flecha «→ venta»), el botón «Identificar» y el enlace de atribución | 6 nodos, el botón «Identificar» y el enlace de atribución | **0** | **0** |
| Cómo se anuncia un tramo | Botón con su frase: «Pozos: 11.360 barriles por día, limita. Abre su detalle.» | Grupo con su `aria-label` y la descripción en inglés «Press enter or space to select a node…» | Botón con su frase y la descripción en español | No se anuncia: todo el SVG es una imagen con un texto largo | Solo la descripción del gráfico |
| Enter abre el detalle | Sí | No | Sí, con unas 10 líneas de código propio | No | No |
| Flechas para pasar de un tramo a otro (U2 §2.8) | Sí | No | No | No | No |
| Rol del contenedor | `group` con la frase de U2 §2.8 | `application`, **fijo** (React Flow lo escribe después de las props: no se puede cambiar) | `application` | `img` | `img` |

- **React Flow se puede dejar accesible**, con `edgesFocusable={false}`, `ariaRole: 'button'` por nodo y `ariaLabelConfig` en español (React Flow 12.7+). Quedan dos cosas que no dependen del equipo de TRIM: el `role="application"` (que en NVDA y JAWS cambia el modo de lectura) y el enlace de atribución, que es una parada más de Tab. Según React Flow, ese enlace solo se quita con la suscripción Pro: «Only remove this attribution, if you are subscribed to React Flow Pro» ([fuente](https://reactflow.dev/learn/troubleshooting/remove-attribution)).
- **ECharts no tiene navegación por teclado.** Su guía de accesibilidad cubre la descripción para el lector y los patrones (*decals*) para el daltonismo, y no menciona el teclado ([fuente](https://echarts.apache.org/handbook/en/best-practices/aria/)). El prototipo lo confirmó: 0 paradas de Tab.
- **El indicador analógico propio usa `role="meter"`**, con `aria-valuenow`, `aria-valuemin` y `aria-valuemax`, y la frase completa de X2 §5.1, punto 12. React Aria y Base UI traen ese mismo rol en su componente `Meter` (§3.1): sirve como referencia, sin instalar nada.

### 3.6 Tematizar con los tokens de ISA-101

| | SVG propio | React Flow | ECharts con SVG | ECharts con canvas |
|---|---|---|---|---|
| Acepta `var(--p1)` y el resto de tokens directo | Sí | Sí: los nodos son HTML y las aristas, SVG | **Casi.** Pinta bien porque zrender copia el texto tal cual al atributo (se verificó en el DOM: `fill="var(--dato-4)"` en 58 de 59 elementos). Pero **la marca de prioridad, que es una imagen `data:` (otro documento, que no ve las variables de la página), salió negra**, y no hay garantía de que funcione lo que calcula colores, como el énfasis al pasar el mouse (**NO VERIFICADO**) | **No.** Todo sale negro, los rótulos desaparecen y **la alarma P2 pierde su color sin avisar** (`ec_r_canvas_vars_1-escritorio-claro.png`) |
| Cambio de tema con la página abierta | Automático | Automático, aunque su propia interfaz (atribución, controles) usa su `colorMode` | Hay que volver a leer los tokens con `getComputedStyle` y volver a llamar `setOption`. El prototipo lo hace y funciona | Igual que con SVG |
| Color solo para lo anormal | Lo decide el código: fácil | Igual | Hay que apagar el color por defecto de cada serie | Igual |

**El riesgo de fondo.** Con canvas, el color de una alarma depende de que alguien haya leído bien el token en JavaScript. Si falla, la alarma se pinta en negro **y nadie se entera**: ni el auditor, ni el PDF, ni la consola. Con SVG o HTML, el token es CSS y cambia solo con el tema.

### 3.7 El peso en el paquete

Medido en el **build real de Vite 8**, contra una página base que solo trae React y el CSS (68,2 KB gzip). Es el JS que la página le suma a esa base:

| Lo que trae la página | + KB gzip | Nota |
|---|---|---|
| SVG propio con `d3-shape` y `d3-scale` (la tubería y los indicadores) | **+17,1** | Incluye el código de la página. **`d3-shape` sola pesa 2,2 KB** (esbuild) |
| 60 pozos en vivo en SVG propio | +3,1 | |
| **React Flow** (la tubería) | **+62,1** | Más 1,8 KB de CSS. La librería sola, 58 KB. Trae **zustand 4**; el repo usa zustand 5, así que irían las dos copias |
| **ECharts modular** (Sankey, `custom`, tooltip, aria y los dos renderizadores) | **+187,4** | Las líneas solas, +172. El paquete completo, +300,6 |
| uPlot | +22,1 | Más 0,7 KB de CSS |
| visx (`LinePath`, escala y grupo) | +15,3 | |
| Recharts (líneas) | +92,2 | |
| Nivo (Sankey) | +69,3 | Trae react-spring |
| Victory (línea y ejes) | +74,9 | |
| JointJS | +56,8 | |
| GoJS | +201,7 | |
| Rete (con styled-components) | +32,8 | |
| maxGraph | +40,4 | |
| Radix: Dialog, Tooltip y Popover | +25,5 | |
| React Aria Components: Dialog, Tooltip, Meter y Button | +29,9 | 1.320 módulos de origen para 4 componentes, y aun así se recorta bien |
| Ark UI: Dialog | +18,9 | |
| Headless UI: Dialog | +14,9 | |
| Base UI: Dialog y Meter | +20,5 | |
| Motion (`motion`, `AnimatePresence`) | +44,0 | Con `LazyMotion` baja a unos 31 (esbuild) |
| auto-animate | +3,1 | |
| View Transitions (nativa y `<ViewTransition>`) | **+0,2** | Es del navegador y de React |
| Íconos: 4 de lucide y 3 de Phosphor | +5,1 | |

**Para ponerlo en escala:** hoy el repo pesa **501 KB gzip de JS en total** y carga **234 KB al abrir** (`dist/`, medido sin tocarlo). Solo ECharts (+187) pesaría más que todo el trozo «costura» del producto (142 KB gzip), donde van el motor y la API.

**Una trampa del repo, comprobada.** `vite.config.ts` agrupa **todo `node_modules` menos React en un solo trozo, `librerias`**, y ese trozo se precarga al abrir la aplicación. En el banco se copió esa regla con una pantalla perezosa (`lazy()`, como `registro.tsx`) que importa React Flow:

- **con la regla de hoy**, React Flow quedó dentro de `librerias` y `index.html` lo precarga: **se baja al arrancar, aunque nadie abra esa pantalla**;
- **con un grupo propio antes de `librerias`**, quedó en su trozo, fuera de la precarga, y se baja solo al abrir la pantalla.

Cualquier librería que entre necesita su grupo (§5.5).

### 3.8 Lo que dice cada dibujo

La librería no es neutral: cada una trae su gramática visual, y la gramática dice cosas.

| | Lo que el usuario lee | Choca con |
|---|---|---|
| **Sankey** (ECharts, Nivo, `d3-sankey`) | Bandas que se parten: lo que entra sale por algún lado. Los 1.665 bbl/d de P-201B salen como **una rama que se va** de la planta | **X4 §4.2**: el diferido «es un estrechamiento», no un goteo. En un Sankey, lo que no se produjo se ve como algo que se desvió o se regó. Además, el Sankey dibuja flujos y no capacidades, así que **«limita» no tiene forma**: queda como un borde más grueso y una palabra |
| **Grafo de nodos y aristas** (React Flow, JointJS, GoJS, Rete) | Cajas unidas por líneas: un diagrama que se edita | Nada de fondo, pero la caja y la línea son genéricas. El tubo, su diámetro y el hueco rayado hay que dibujarlos a mano **dentro** del nodo, así que la librería solo aporta la posición |
| **Tubo dibujado** (SVG propio) | Un tubo cuyo diámetro es lo que cabe, con lo que pasa adentro y el hueco rayado donde se trabó | Nada: es la anatomía de X4 §4.2 y la dirección C de X1 tal cual |

Por eso el Sankey se descarta **para la planta del gerente** aunque se vea bien: lo que no se produjo debe leerse como «no entró», y el Sankey lo dibuja como «se fue».

---

## 4. Cada familia, criterio por criterio

**Cómo leer las tablas.** «Probado» quiere decir que se midió en el banco (§1). El peso es lo que la librería suma en gzip (§3.7). «Actividad» sale de npm y de la API de GitHub, consultadas el 25-oct-2026: versiones publicadas en los últimos 12 meses, *commits* en los últimos 6 y fecha del último *commit*. «Respaldo» es quién la mantiene.

### 4.1 Diagramas de proceso y flujo (el corazón de la planta)

| | React 19 y TS estricto | Licencia | Peso | Accesibilidad | Tokens ISA-101 | CSP | Rendimiento en vivo | SVG o canvas | Actividad y respaldo | Teléfono |
|---|---|---|---|---|---|---|---|---|---|---|
| **SVG propio + `d3-shape`** | Sí, probado: es código propio; tipos `@types/d3-shape` | ISC | **+2,2** (`d3-shape`); +9,7 con `d3-scale` | La que se escriba: probado con 5 paradas de Tab y botones en español | **Directo** (`var(--…)`) | 0 | **El mejor**: 8 ms por actualización con 60 pozos y 19 ms con 150, con la CPU 4× y sin tareas largas (§3.3) | SVG: el auditor lo lee | d3: Observable y Mike Bostock; `d3-shape` va por la 3.2.0 (dic-2022): **terminada y estable**, 61 M de descargas por semana. El dibujo lo mantiene TRIM | Probado: de pie, el dedo desplaza |
| **React Flow** (`@xyflow/react` 12.12) | Sí, probado; peer `react >=17` | **MIT** | +58 a +62 | Configurable desde la 12.7. `role="application"` fijo, aristas en inglés y atribución de fábrica (§3.5) | Directo en nodos y aristas | 0 | 19,5 ms con 60 pozos y 54 ms con 150, **con 13 tareas largas a 150** (§3.3); de 3 a 6 veces los nodos del DOM | DOM y SVG: el auditor lo lee, con un falso positivo fijo | **xyflow GmbH** (Berlín), financiada con React Flow Pro; 38,8 k★; 15 versiones y más de 100 *commits*; último *commit* 22-oct-2026 | **Se traga el gesto** de fábrica (§3.4) |
| **JointJS** (`@joint/core` 4.3.3, `@joint/react` 4.3.6) | Probado el núcleo; `@joint/react` pide `react >=18` y **no se probó** | **MPL-2.0**: copyleft por archivo (si se modifica un archivo suyo, ese archivo se publica). **JointJS+ es comercial**: US$ 2.990 por desarrollador ([FAQ](https://www.jointjs.com/faq)) | +57 | **NO VERIFICADO** | Acepta `var(--…)` en sus atributos (probado) | 0 | No se midió | SVG | client IO; 5,4 k★; 16 versiones y 90 *commits*; último 23-oct-2026 | NO VERIFICADO |
| **GoJS** 4.0.5 | `gojs-react` 1.1.3 (may-2025); peer `react >=16` | **Comercial**: US$ 3.995 individual, 6.990 hasta 3 desarrolladores, 11.950 hasta 20 ([precios](https://gojs.net/latest/pricing)). Sin licencia **muestra marca de agua** «Not for distribution or production use» (probado: `sonda-gojs.png`) | **+202** | Canvas: nada para el lector | No lee CSS: hay que pasar colores | 0 | No se midió | **Canvas** | Northwoods Software; 19 versiones | NO VERIFICADO |
| **Rete.js** 2.0.6 | Probado; el plugin pide `react ^19` | MIT | +33 | NO VERIFICADO | Su tema por defecto es azul e inyecta estilos (styled-components) | 0 | No se midió | DOM y SVG | 12,3 k★. **El núcleo no tiene *commits* desde jun-2025**; los plugins sí | NO VERIFICADO |
| **maxGraph** 0.25.1 (y mxGraph) | Escrito en TS; sin envoltorio de React | Apache-2.0 | +40 | NO VERIFICADO | Estilos propios, no CSS | 0 (trae `eval` apagado, §3.1) | No se midió | SVG | **Versión 0.x**: su README dice que está «under active development, with a few adjustments still required to match the behavior of mxGraph» ([repo](https://github.com/maxGraph/maxGraph)); 1,2 k★. **mxGraph está archivado desde nov-2020** | NO VERIFICADO |

**Lo que se ve en la tabla:**

- **Las cuatro librerías de grafos (React Flow, JointJS, GoJS y Rete) son editores**: arrastrar, conectar, seleccionar, hacer zoom. La planta de TRIM es **un dibujo fijo que se lee**, con 4 tramos, 3 carriles y la rama del agua. Todo lo que traen para editar hay que apagarlo, y lo que queda (la posición de las cajas) es lo fácil de hacer a mano. El prototipo de React Flow lo mostró: más peso, más DOM, más lento, el gesto tragado, `role="application"` y la atribución. Nada de eso le da al usuario algo que el SVG propio no dé.
- **Rete es otra cosa: programación visual**, con enchufes de entrada y salida («JavaScript framework for visual programming», [repo](https://github.com/retejs/rete)). Se ve en `sonda-rete.png`.
- **GoJS y JointJS+ cobran por desarrollador.** Para un dibujo fijo, no se justifica.

**Referentes SCADA y HMI** (no son librerías para meter en React; sirven de modelo):

| Referente | Qué es | Para qué le sirve a TRIM |
|---|---|---|
| **FUXA** ([repo](https://github.com/frangoteam/FUXA)) | SCADA/HMI web completo, **MIT**, en Angular y Node; 5,2 k★, con *commits* el 25-oct-2026 | **154 formas de proceso en SVG** (`client/src/assets/lib/svgeditor/shapes/img/`): bombas centrífugas, compresores, agitadores… Son dibujos de **solo trazo**, de 24×24, sin degradados (se revisaron `centrifugal.svg` y `compressor-void.svg`). Sirven de fuente para redibujar en gris un equipo que falte en `Simbolos.tsx` (la electrosumergible, la multifásica), con la licencia MIT citada |
| **Ignition Perspective** (Inductive Automation, comercial) | Plataforma SCADA | Dos ideas: sus símbolos traen **tres apariencias**, «P&ID, simple and mimic», para todo el proyecto o por componente ([fuente](https://inductiveautomation.com/resources/video/perspective-symbols)). Y su **Moving Analog Indicator**: «segments showing the desired operating range, low and high alarm ranges, and interlock ranges»; «If the value is in one of its alarm ranges, then that range changes color» ([fuente](https://docs.inductiveautomation.com/docs/7.9/appendix/components/display/moving-analog-indicator)). Coincide con X2 §5.1 |
| **draw.io** (jgraph/drawio, Apache-2.0) | Su biblioteca P&ID | Son **código JS** (`src/main/webapp/shapes/pid2/mxPidValves.js`, `mxPidInstruments.js`, `mxPidMisc.js`), no SVG: habría que convertirlas. Además, su `stencils/LICENSE` **agrega una restricción**: no se pueden usar en productos de Atlassian. A TRIM no lo toca, pero ya no es Apache puro. Sirve de referencia visual |
| **Símbolos ISA-5.1 libres** | — | **No se encontró una biblioteca SVG con licencia MIT o Apache que siga ISA-5.1** (búsqueda del 25-oct; **NO VERIFICADO** que no exista). La de ISA se vende en DWG y DXF. La de Black & Veatch es CC-BY, en formato de MicroStation y con la norma británica. **Conclusión:** los símbolos de TRIM siguen siendo propios (`Simbolos.tsx` ya va en ese estilo: el separador lleva su burbuja «LI»), dibujados según ISA-5.1 |

### 4.2 Gráficos

| | React 19 y TS | Licencia | Peso | Accesibilidad | Tokens | CSP | Rendimiento en vivo (12 series × 1.800 puntos, CPU 4×) | SVG o canvas | Actividad y respaldo | Teléfono |
|---|---|---|---|---|---|---|---|---|---|---|
| **uPlot** 1.6.32 | No necesita envoltorio (unas 20 líneas); trae sus tipos | MIT | +22 (y 0,7 de CSS) | Ninguna propia: necesita su tabla equivalente | Hay que leerlos en JS | 0 | **El mejor** (§3.3) | **Canvas**; la leyenda es DOM | **Una sola persona** (Leon Sorokin); 10,6 k★; *commits* activos, pero la última versión en npm es de mar-2025 | Sin probar el táctil; sus fechas salen en inglés de fábrica («1:00am») y hay que configurarlas |
| **visx** 4.0.0 | Sí; peer `^18 \|\| ^19` | MIT | +15 | La que se escriba | Directo | 0 | Bueno (§3.3) | SVG | **Airbnb**; 21 k★; 36 *commits*; versión 4.0 de jun-2026 | La que se escriba |
| **Apache ECharts** 6.1.0 | Sí, con un envoltorio propio de 20 líneas (`echarts-for-react` también existe) | **Apache-2.0** | **+164 a +187** modular; +301 completo | Descripción automática y *decals*; **sin teclado** | **No lee CSS** (§3.6) | 0 | Aceptable **solo con `dataset`** (§3.3) | SVG o canvas | **Apache Software Foundation**; 67,6 k★; 63 *commits*; 3 versiones | Rótulos encimados en el Sankey de pie (§3.4) |
| **Recharts** 3.10.1 | Sí | MIT | +92 | Trae `accessibilityLayer` (**NO VERIFICADO** en esta prueba) | Directo | 0 | **El peor**: no sirve para tendencias densas en vivo (§3.3) | SVG | Comunidad; 27,7 k★; 22 versiones | — |
| **Nivo** 0.99.0 | Sí; peer `^19` | MIT | +69 (Sankey, con react-spring) | NO VERIFICADO | Por su tema | 0 | No se midió | SVG o canvas | Una persona (plouc). **Sin versiones desde may-2025**; 10 *commits* | — |
| **Victory** 37.3.6 | Funciona; peer `>=16.6` | MIT | +75 | NO VERIFICADO | Directo | 0 | No se midió | SVG | Nearform. **Sin versiones desde ene-2025 ni *commits* desde dic-2025** | — |
| **Tremor** (`@tremor/react` 3.18.7) | **No: pide `react ^18`** | Apache-2.0 | — (no se instaló) | — | Tailwind | — | — | SVG (encima de Recharts) | **Vercel la compró en ene-2025** ([nota legal](https://www.walderwyss.com/fr/news/2025-01-22_walder-wyss-advises-on-exit-of-y-combinator-startup-tremor-labs-inc-to-vercel-inc)). El paquete npm no cambia desde ene-2025 y su repositorio nuevo no tiene *commits* desde oct-2025 | — |

**Ninguna trae el indicador de alto desempeño.** ECharts tiene un *gauge*, pero es redondo, y X2 §5.1 pide la escala lineal con la banda normal. En las tres librerías candidatas hubo que dibujarlo a mano. En ECharts, como serie `custom`, quedó **sin la forma de la marca de prioridad** junto al valor: hay que dibujar también el rombo o el triángulo con primitivas de zrender. En SVG propio es el mismo `MarcaPrioridad` del producto.

### 4.3 Componentes base accesibles

| | React 19 y TS | Licencia | Peso (lo que se probó) | Accesibilidad | Tailwind v4 y tokens | CSP | Actividad y respaldo |
|---|---|---|---|---|---|---|---|
| **React Aria Components** 1.22.1 | Sí; peer hasta `^19` | **Apache-2.0** | +30 (Dialog, Tooltip, Meter y Button) | **La más completa**: teclado, lectores de pantalla e internacionalización con `Intl` (cifras y fechas en es-CO). Trae `Meter` con `role="meter"` (probado) | Sin estilos; hay un plugin oficial para Tailwind v4: `tailwindcss-react-aria-components` 2.2.0, peer `tailwindcss ^4` | 0 | **Adobe**; 239 versiones en 12 meses (se publica casi cada semana: hay que fijar versiones) |
| **Base UI** (`@base-ui/react` 1.9.0) | Sí; peer `^17 \|\| ^18 \|\| ^19` | MIT | +20,5 (Dialog y Meter) | Buena; trae `Meter` con `role="meter"` (probado) | Sin estilos | 0 | **El equipo de MUI**; versión 1 desde dic-2025; 11,2 k★. **Desde jul-2026 es la base por defecto de shadcn/ui**: «New projects now use Base UI by default. Radix is still fully supported» ([changelog](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)) |
| **Radix** (`radix-ui` 1.8.1) | Sí | MIT | +25,5 (Dialog, Tooltip y Popover) | Buena | Sin estilos | 0 | **WorkOS**; 19,4 k★; activa. Sigue en shadcn: «Radix is not being deprecated». Hay dudas de terceros sobre su mantenimiento; **NO VERIFICADO** |
| **shadcn/ui** | No es una dependencia: un CLI **copia** componentes (MIT) hechos sobre Base UI o Radix y Tailwind | MIT | Lo que se copie | La de su base | Tailwind v4 | — | Vercel y comunidad; 126 k★. Su aspecto por defecto es el de miles de tableros: chocaría con la identidad que busca X1 |
| **Ark UI** 5.39.3 | Sí; peer `>=18` | MIT | +19 (Dialog) | Buena (máquinas de estado de Zag.js) | Sin estilos | 0 | **El equipo de Chakra UI**; 5,4 k★; activa |
| **Headless UI** 2.2.10 | Sí | MIT | +15 (Dialog) | Buena, pero **pocos componentes**: no tiene Tooltip ni Meter | Pensada para Tailwind | 0 | Tailwind Labs. **Sin *commits* de código en 6 meses** (el último, de abr-2026, cambia la versión de una acción de CI) |

**¿Hace falta alguna?** Hoy, no. El repo tiene sus propias piezas (`primitivas.tsx`, `Tip`, `Info`, `HojaInferior`), con su accesibilidad probada en las e2e. Hará falta **si la arquitectura nueva de X4 trae controles con teclado complejo**: menús, pestañas con flechas, buscadores (*combobox*), hojas modales con foco atrapado. Hacerlos a mano con buena accesibilidad es caro y fácil de errar.

### 4.4 Movimiento

X2 §5.5 y §6.7 (M1) ya fijaron la regla: **ninguna animación salvo las transiciones de navegación de 200 ms o menos, y ninguna con `prefers-reduced-motion`.** Contra esa regla:

| | Peso | Licencia y respaldo | Encaja con ISA-101 | Veredicto |
|---|---|---|---|---|
| **View Transitions** del navegador y **`<ViewTransition>` de React 19.3** | **0** (+0,2 de código propio) | Navegador; React (Meta). Baseline 2025: «Since October 2025, this feature works across the latest devices and browser versions» ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition)). Estable en React 19.3 (9-sep-2026): «both of these are now stable in React 19.3» ([blog de React](https://react.dev/blog/2026/09/09/react-19-3)) | Sí: sirve justo para la transición de navegación, y la duración y el `prefers-reduced-motion` se manejan en CSS | **Sí** |
| **Motion** (antes framer-motion) 14.6.0 | +44 (unos 31 con `LazyMotion`) | MIT; Motion Division; muy activa | Es una herramienta para mover mucho; aquí sobraría casi todo | **No** |
| **auto-animate** 0.10.0 | +3 | MIT; FormKit | **Anima todo** lo que entra, sale o se mueve en un contenedor, también los cambios normales: eso contradice la norma (el movimiento es para lo anormal) | **No** |

Detalle: `@types/react` 19.2.18, el que tiene el repo, no declara `ViewTransition`; la versión 19.3.0 sí (9-sep-2026). En el banco hubo que usar `/// <reference types="react/canary" />`.

### 4.5 Íconos

| | Licencia | Peso | Qué trae de proceso | Veredicto |
|---|---|---|---|---|
| **lucide-react** 1.61.0 (ya está en el repo) | ISC | Unos 0,6 KB gzip por ícono (4 íconos: 2,3) | `Factory`, `Gauge`, `Droplet(s)`, `Cylinder`, `Barrel`, `Container`, `Flame`, `Fuel`, `Thermometer`, `Waves`, `Wrench`, `Siren`, `Lock`, `WifiOff`… **Ni válvulas, ni bombas, ni burbujas de instrumento** | **Se queda** |
| **Phosphor** (`@phosphor-icons/react` 2.1.10) | MIT | Parecido | 1.512 íconos en 6 pesos; suma `Pipe`, `PipeWrench` y `Engine`. **Tampoco trae válvulas ni bombas.** Sin versiones desde may-2025 y sin *commits* en su núcleo en 6 meses | **No**: sería un segundo idioma visual por tres íconos |
| **Símbolos ISA-5.1 y P&ID** | — | — | Ver §4.1 | **SVG propios** (`Simbolos.tsx`), con FUXA como fuente MIT |

---

## 5. Recomendación

### 5.1 El stack

| Pieza | Qué se usa | Cuándo | Lo que suma |
|---|---|---|---|
| **La planta viva, la tubería del campo, la del agua y el esquema** | **SVG propio en React**, como `Tuberia.tsx` y `Planta.tsx` hoy | Ya | 0 |
| Las curvas del tubo (reducciones, codos, la rama del agua) | **`d3-shape`**, solo para calcular el atributo `d` de un `<path>` (`area`, `curveBumpX`, `linkVertical`). React pinta; d3 no toca el DOM | Si el diseño final de X1 y X4 lleva curvas. Una curva Bézier a mano también sirve | +2,2 KB gzip, ISC, 0 dependencias en tiempo de ejecución salvo `d3-path` |
| **El indicador analógico y la barra contra la meta** | **SVG y HTML propios**: `Analogico.tsx` y `BarraMeta.tsx`, ajustados a X2 §5.1 (el prototipo de `AnalogicoSvg.tsx` ya cumple su lista) y con `role="meter"` | Ya | 0 |
| **Las tendencias** | SVG propio (`Sparkline`, `Serie`) mientras sean cortas | Ya | 0 |
| Tendencias densas en vivo (técnico tipo SCADA: varias variables, horas de historia, cada pocos segundos) | **uPlot**, en una pantalla perezosa y en su propio trozo, **con su tabla equivalente** | Solo si un rol técnico lo pide | +22 KB gzip, MIT |
| **Componentes base** | Las piezas propias de hoy | Ya | 0 |
| Controles con teclado complejo (menú, pestañas con flechas, buscador, hoja modal) | **React Aria Components**, solo los que hagan falta. **Base UI** si el equipo prefiere el ecosistema de shadcn | Cuando la arquitectura de X4 los traiga | Medido: +30 KB gzip con 4 controles de React Aria, +20,5 con 2 de Base UI; Apache-2.0 o MIT |
| **Movimiento** | **View Transitions** del navegador y `<ViewTransition>` de React 19.3, con la duración en CSS (≤ 200 ms, X2 M1) y `prefers-reduced-motion` en 0 | Cuando se haga la navegación nueva | 0 KB; pide `@types/react` 19.3 |
| **Íconos** | **lucide**, como hoy. Los símbolos de proceso, en `Simbolos.tsx` según ISA-5.1, redibujando de las formas MIT de FUXA lo que falte | Ya | 0 |

**Por qué SVG propio es lo mejor y no solo lo más barato.** En la prueba de verdad ganó en casi todos los criterios a la vez:

1. **Peso:** +3 a +17 KB, contra +62 de React Flow y +187 de ECharts.
2. **Rendimiento:** menos de la mitad del costo de React Flow o ECharts por actualización, y sin tareas largas ni con 150 pozos (§3.3).
3. **Auditor:** el único con 0 hallazgos en los 5 anchos; React Flow trae un falso positivo fijo.
4. **Teclado y lector:** las paradas exactas, en español, sin pegamento y sin `role="application"`.
5. **Tokens:** directos, también al cambiar el tema con la página abierta.
6. **PDF:** vectorial, con texto real.
7. **Teléfono:** su propio dibujo de pie, y el dedo desplaza la página.
8. **Lo que dice:** dibuja exactamente la anatomía de X4 §4.2 (contorno, relleno y hueco rayado en cada tramo; la gota, cuando haya dato) y la reducción del tubo donde limita. Ninguna librería trae esa gramática; con una librería, el dibujo habría que hacerlo a mano igual, adentro de sus nodos o de su serie `custom`.

**Lo que cuesta:** el acomodo del texto en SVG es manual (no hay salto de línea automático) y la disposición en el teléfono es otro dibujo. Lo atenúa que el dibujo es chico (4 tramos, 3 carriles, la rama del agua), que la geometría puede ir en funciones puras con pruebas, y la regla nueva del auditor (§5.5).

### 5.2 Lo que se descarta, y por qué

| Librería | Por qué no | ¿Volvería? |
|---|---|---|
| **React Flow** | Es un editor de grafos, y la planta es un dibujo fijo. En la prueba: +62 KB; más del doble de costo por actualización y de 3 a 6 veces el DOM; 13 tareas largas en 20 s con 150 pozos; **se traga el gesto en el teléfono**; `role="application"` fijo; aristas en inglés con foco; la atribución, que según React Flow solo se quita con Pro; un falso positivo fijo en el auditor | **Sí, si algún día hace falta EDITAR una topología en un lienzo** (por ejemplo, dibujar la red de un campo nuevo en Configuración). Es MIT, está viva y pasó la CSP. Sería la primera opción, por encima de JointJS+ y GoJS, que cobran |
| **Apache ECharts** | +164 a +187 KB, que es más que todo el trozo «costura» del producto (142 KB). **No lee las variables CSS**: con canvas la alarma puede pintarse en negro sin aviso. Sin teclado. **Si falta registrar un componente en la importación modular, la versión de producción deja el gráfico en blanco sin avisar** (le pasó al banco con `dataset`, §3.3). Rótulos encimados en el teléfono. Y su Sankey **dibuja el diferido como una rama que se va**: la gramática que X4 §4.2 prohíbe, porque se lee como derrame | Solo si TRIM necesita muchos tipos de gráfico clásico (mapas, calendarios, cajas…). Hoy no |
| **Recharts** | No aguanta tendencias densas en vivo: 225 ms por actualización y el 94 % del hilo principal ocupado con una actualización cada 250 ms (§3.3); +92 KB | No para lo vivo |
| **Nivo** y **Victory** | Sin versiones desde may-2025 y ene-2025; +69 y +75 KB | No |
| **Tremor** | Pide React 18; quieta desde que la compró Vercel | No |
| **JointJS** | Editor de diagramas; MPL-2.0 y la parte útil, comercial | No |
| **GoJS** | Comercial, con marca de agua sin licencia, en canvas y +202 KB | No |
| **Rete.js** | Programación visual; núcleo sin *commits* desde jun-2025 | No |
| **maxGraph** | Todavía 0.x, con `eval` en el código (apagado); mxGraph está archivado | No |
| **visx** | Buena (Airbnb, SVG, +15 KB), pero hoy TRIM ya dibuja sus ejes y escalas | Si las gráficas del libro crecen en ejes y escalas de tiempo, es la que conviene |
| **Motion** y **auto-animate** | La norma deja solo transiciones de navegación, y eso lo hace el navegador gratis | No |
| **Phosphor** | Un segundo idioma de íconos por tres íconos; quieta desde 2025 | No |
| **Headless UI** | Pocos componentes y sin actividad | No |
| **Radix** y **Ark UI** | Válidas, pero React Aria y Base UI cubren lo mismo con más respaldo o más futuro (Base UI es la base de shadcn desde jul-2026) | Solo como alternativa |

### 5.3 Riesgos

1. **Que el SVG propio se vuelva una gráfica difícil de mantener.** Mitigación: la geometría en funciones puras con pruebas unitarias (el motor ya da las cifras hechas); un componente por pieza (tramo, carril, rama del agua, marca); la regla nueva del auditor.
2. **Solo se probó Chromium.** Safari en iPhone y Firefox quedan **NO VERIFICADOS**. Dos puntos hay que mirarlos primero: el `<svg x="%">` anidado del puntero del indicador y las View Transitions. React 19.3 trae una corrección de un fallo de `<ViewTransition>` en Safari móvil (#35337, en su blog).
3. **Más de 150 pozos** en un solo dibujo vivo no se probó (**NO VERIFICADO**). Si algún día se dibujan cientos de equipos a la vez, hará falta virtualizar o pasar ese dibujo a canvas, con su tabla equivalente.
4. **uPlot, si entra, depende de una sola persona** y es canvas: el auditor y el PDF no lo leen. Por eso va con su tabla y nunca como único lugar de una cifra.
5. **React Aria publica casi cada semana**: hay que fijar las versiones y actualizarlas a propósito.
6. **`style-src 'unsafe-inline'` tiene que quedarse** (§3.1). Si un día se endurece, se rompen React y cualquier librería.

### 5.4 El costo de adoptarlo en el repo

| Paso | Dependencias nuevas | Peso | Esfuerzo |
|---|---|---|---|
| Ahora: SVG propio, indicador según X2, View Transitions | **0**, o `d3-shape` + `@types/d3-shape` si se quieren las curvas | 0 a +2,2 KB gzip | Código de pantalla; `@types/react` a 19.3 para `<ViewTransition>` |
| Después, si un rol técnico pide tendencias densas | `uplot` | +22 KB gzip, en su propio trozo | Un componente envoltorio (unas 40 líneas), la tabla equivalente y la hora en es-CO |
| Después, si la arquitectura de X4 trae controles complejos | `react-aria-components` (o `@base-ui/react`) y, para Tailwind, `tailwindcss-react-aria-components` | Unos +20 a +30 KB gzip con 2 a 4 controles (medido) | Envolver cada control con los tokens; fijar versiones |

### 5.5 Cómo convive con lo que ya existe

**Tailwind v4.** El SVG propio usa los tokens como variables CSS, igual que hoy (`fill="var(--p1)"`), y las clases de Tailwind en el HTML de alrededor. No hay nada que configurar. Si algún día entra React Flow, su hoja va **en la capa `base` y antes de Tailwind**, como dice su documentación: `@import "@xyflow/react/dist/base.css" layer(base);`. Se probó y funciona. Además necesita `.react-flow__pane { touch-action: pan-y; }` (§3.4).

**Los SVG que ya existen.** `Tuberia.tsx`, `Planta.tsx`, `Simbolos.tsx`, `Analogico.tsx`, `BarraMeta.tsx`, `Sparkline.tsx` y `Serie.tsx` siguen siendo la base. Lo nuevo de la planta viva es la evolución de `Tuberia.tsx`, no un reemplazo.

**`vite.config.ts`: un grupo propio para cada librería que entre.** Hoy todo `node_modules` menos React va a `librerias`, que se precarga al arrancar (§3.7). Antes de esa regla:

```ts
// Antes de { name: 'librerias', … }: lo pesado que solo usa una pantalla, aparte.
{ name: 'graficas', test: /node_modules[\\/](uplot)[\\/]/ },
```

**Las e2e (209 pruebas).** El SVG propio se prueba como hoy: por texto visible, por `data-*` (`data-tramo`, `data-limita`, `data-diferido`) y por el `aria-label`. Un gráfico en canvas solo se podría probar por su tabla equivalente.

**El auditor de desbordes (100 rutas, 5 anchos).** Dos cambios:

1. **Agregar la regla del texto SVG cortado** (§3.2). Va en `detectar()` de `e2e/auditoria/detector.ts`, después del recorrido de hoy:

```ts
// Un <text> que se sale de su <svg> queda cortado (el SVG recorta por defecto) y el
// recorrido de arriba solo usa esos textos para buscar encimados.
for (const t of raiz.querySelectorAll('svg text')) {
  let s = t.closest('svg')
  for (let p = s?.parentElement?.closest('svg'); p; p = p.parentElement?.closest('svg')) s = p
  if (!s || !t.textContent?.trim()) continue
  const r = t.getBoundingClientRect(), q = s.getBoundingClientRect()
  const sale = Math.max(q.left - r.left, r.right - q.right, q.top - r.top, r.bottom - q.bottom)
  if (sale > 1.5) out.push(['recortado', desc(t), Math.round(sale), desc(s)])
}
```

Se comprobó que `detector.ts` con esta regla compila con las opciones estrictas de `tsconfig.e2e.json` (copia en el banco, `detector-prueba/`). La misma lógica, corrida en el navegador, encontró los 5 rótulos cortados de ECharts.

2. **Ningún dibujo informativo en canvas** sin su equivalente en DOM. El auditor no lo ve, y un hallazgo en 0 sería una mentira cómoda.

**La CSP.** Nada cambia: ninguna pieza recomendada necesita `eval` ni otro origen.

---

## 6. Desacuerdos

1. **Con X4 §8, punto 9 («Sin librerías nuevas. La planta viva es SVG propio»).** Coincido en lo esencial, y la prueba de verdad lo respalda con cifras (§3 y §5.1). Dos precisiones, que no son desacuerdos:
   - **`d3-shape`** (2,2 KB, ISC) solo calcula trazos y no es una librería de interfaz. Si el tubo lleva reducciones y codos como en la dirección C de X1, ahorra escribir esa geometría a mano. Si no, no hace falta.
   - **React Aria Components o Base UI**, solo si la navegación nueva trae controles con teclado complejo (§4.3). La planta no los necesita; las puertas y las hojas de X4 podrían.
2. **Entre X1 §4.3 y X2 §6.7, sobre la duración del movimiento.** X1 propone para la dirección C un «zoom semántico de 240–320 ms entre niveles», y X2 (M1) pone el tope en 200 ms. La técnica recomendada (`<ViewTransition>` de React 19.3 con un `name` compartido para que la placa crezca desde su lugar) sirve para las dos: la duración es una línea de CSS. **Me quedo con X2 (≤ 200 ms)**, porque es la regla de la norma y se puede medir en CI. Lo decide el coordinador.
3. **Con la frase de mi propio encargo («una pérdida en un tramo»).** Para X4 §4.2 y para Edinson, lo que se dibuja en el tramo donde se trabó es **diferido**: un estrechamiento rayado, no una pérdida. La gota es para el crudo que se regó, y hoy no hay ese dato («sin eventos registrados», X4 §4.2), así que el prototipo **no inventa una pérdida**: dibuja el diferido de P-201B como hueco rayado. Si el coordinador quería una gota de ejemplo, se agrega con un dato que alguien firme.
4. **Con el `Analogico.tsx` del producto (no con otro agente).** Hoy pinta el puntero y el valor con el color de la prioridad, y si alguien le pasa `estado={3}` el valor sale en amarillo: según el mismo `index.css`, ese amarillo da 1,6:1 contra el panel claro. X2 §5.1 lo corrige (puntero y valor en tinta, la marca al lado). El prototipo ya lo hace así y no pierde nada de lectura (`svg-escritorio-claro.png`).
5. **Con ECharts como «la librería de gráficos para todo».** No lo propuso nadie del equipo, pero es la opción por defecto que suele salir en estas discusiones. La prueba la descarta para la planta y para los indicadores, por el peso, por los tokens, por el teclado y por la gramática del Sankey (§5.2).

**Una nota de diseño para X1 y X4, sin desacuerdo.** El prototipo de SVG propio centra la banda de «lo que pasa» en el eje del tubo, con la pared como reducción. La tubería de hoy (U2 §2.3) la alinea abajo, para que «lo que pasa hoy» sea una línea recta. Centrada se lee más como tubería; abajo, más como barra. Las dos son SVG propio y cuestan lo mismo: es una decisión de diseño, no de librería.

---

## 7. Fuentes

**Medidas propias** (banco del §1; todo en `/private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/ux/x3/`):

| Qué | Archivo |
|---|---|
| CSP, errores, auditor y conteos de cada página | `resultados/ver-ultimo.json`, `resultados/ver-sondas.json` |
| Rendimiento | `resultados/rendimiento-final60.json`, `rendimiento-final150.json`, `rendimiento-final-ecmodos.json` |
| Peso (esbuild y Vite) | `resultados/pesos.json`, `resultados/pesos-vite.json` |
| Árbol ARIA y recorrido de Tab | `resultados/acceso.json` |
| Búsqueda estática de `eval` y `new Function` | `herramientas/buscar-eval.mjs` |
| La prueba de los trozos de `vite.config.ts` | `proto/split/` |
| Metadatos de npm (versión, licencia, fechas, *peers*) | `investigacion/meta-*.json` |
| Los scripts del banco | `proto/pruebas/` (`ver.mjs`, `rendimiento.mjs`, `acceso.mjs`, `tactil.mjs`, `texto-svg.mjs`, `enter.mjs`) |

**Del repo:** `demo/cabeceras.mjs`, `demo/servidor.mjs`, `vite.config.ts`, `index.html`, `src/index.css`, `src/shared/ui/Analogico.tsx`, `src/shared/ui/Prioridad.tsx`, `src/widgets/choke/Tuberia.tsx`, `src/widgets/planta/Simbolos.tsx`, `src/pages/Planta.tsx`, `e2e/auditoria/detector.ts`, `e2e/auditoria/rutas.ts`, `docs/plan-circular-24/U2-choke-experiencia.md` §2, y en esta carpeta `BRIEF.md`, `X1-identidad-referentes.md` §4.3, §5 y §6, `X2-norma-hmi.md` §5 y §6.7, y `X4-arquitectura-roles.md` §4.2 y §8.

**Externas** (consultadas el 25-oct-2026):

- React Flow: [tematización](https://reactflow.dev/learn/customization/theming), [novedades: React 19 y Tailwind 4, accesibilidad en la 12.7](https://reactflow.dev/whats-new), [la atribución](https://reactflow.dev/learn/troubleshooting/remove-attribution), [repositorio](https://github.com/xyflow/xyflow).
- JointJS: [FAQ y licencias](https://www.jointjs.com/faq), [repositorio](https://github.com/clientIO/joint).
- GoJS: [precios y licencias](https://gojs.net/latest/pricing).
- maxGraph: [repositorio](https://github.com/maxGraph/maxGraph). mxGraph archivado: [repositorio](https://github.com/jgraph/mxgraph).
- Rete.js: [repositorio](https://github.com/retejs/rete).
- Apache ECharts: [novedades de la 6.0](https://echarts.apache.org/handbook/en/basics/release-note/v6-feature/), [accesibilidad](https://echarts.apache.org/handbook/en/best-practices/aria/), [repositorio](https://github.com/apache/echarts).
- uPlot: [repositorio y sus límites](https://github.com/leeoniya/uPlot).
- Tremor y Vercel: [nota legal de la compra, 22-ene-2025](https://www.walderwyss.com/fr/news/2025-01-22_walder-wyss-advises-on-exit-of-y-combinator-startup-tremor-labs-inc-to-vercel-inc).
- shadcn/ui: [Base UI por defecto, jul-2026](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default).
- React 19.3: [blog, 9-sep-2026](https://react.dev/blog/2026/09/09/react-19-3). View Transitions: [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition).
- FUXA: [repositorio](https://github.com/frangoteam/FUXA). draw.io: [repositorio](https://github.com/jgraph/drawio) (licencia de los esténciles en `src/main/webapp/stencils/LICENSE`).
- Ignition: [símbolos de Perspective](https://inductiveautomation.com/resources/video/perspective-symbols), [Moving Analog Indicator](https://docs.inductiveautomation.com/docs/7.9/appendix/components/display/moving-analog-indicator).
- La norma de alto desempeño (ISA-101, Hollifield, ASM) está fuentada en `X2-norma-hmi.md` §1; aquí no se repite.
- Estrellas, versiones, fechas y *commits*: API de GitHub (`gh api repos/…`) y registro de npm (`npm view`), 25-oct-2026.

---

## 8. Resumen

1. Todo se probó en un banco aparte con las versiones exactas del repo y su CSP copiada byte a byte. Un canario con `eval` comprueba que el banco ve lo que la política bloquea.
2. **Las 21 librerías evaluadas pasaron la CSP sin `eval`** (0 violaciones, 0 errores): la seguridad no decide entre ellas.
3. La tubería de La Ceiba (U2 §2.2) y el indicador analógico de X2 §5.1 se armaron en **SVG propio + `d3-shape`**, en **React Flow** y en **ECharts** (SVG y canvas), con capturas, PDF, auditor, teclado, táctil y datos en vivo.
4. **Ganó SVG propio:** +3 a +17 KB; 8 ms por actualización con 60 pozos y 19 ms con 150, sin tareas largas; 0 hallazgos del auditor en los 5 anchos; Tab en español; tokens directos; texto real en el PDF.
5. **React Flow** es un editor: se traga el gesto en el teléfono, trae `role="application"` fijo y la atribución, y deja un falso positivo en el auditor. Queda como plan B solo para *editar* topologías.
6. **ECharts** suma +187 KB, no lee CSS (con canvas, una alarma puede salir negra sin aviso), no tiene teclado, deja el gráfico en blanco sin avisar si falta registrar un componente, y su Sankey dibuja el diferido como una fuga, justo lo que X4 prohíbe.
7. **El stack:** SVG propio (y `d3-shape` si hay curvas); los indicadores, propios según X2; **uPlot** solo si piden tendencias densas (7 ms por actualización frente a 274 de Recharts, con la CPU de un teléfono); **React Aria** o **Base UI** solo para controles complejos; **View Transitions** nativas (0 KB); **lucide**.
8. **El costo ahora:** 0 dependencias, o `d3-shape` (2,2 KB gzip).
9. **Dos cambios en el repo al adoptar algo:** un grupo propio en `vite.config.ts` (si no, la librería se precarga al arrancar: comprobado) y una regla nueva en el auditor para el texto SVG cortado. Hoy no lo ve; en la prueba atrapó 5 rótulos de ECharts y un error del propio prototipo.
10. **Riesgos:** solo se probó Chromium (Safari y Firefox, NO VERIFICADOS); más de 150 pozos, sin probar; uPlot depende de una sola persona.
11. **Desacuerdos:** precisiones a X4 («sin librerías nuevas»); la duración del movimiento entre X1 y X2 (me quedo con ≤ 200 ms); y en el dibujo, el diferido no es una pérdida.
