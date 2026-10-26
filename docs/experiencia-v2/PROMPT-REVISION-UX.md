# Prompt · Revisión total de experiencia, diseño y QA de TRIM Hidrocarburos

> Para pegar a una IA o a un equipo de agentes que trabaje sobre el repositorio `/Users/hollman/trim-hidrocarburos`.

---

## 0. Tu papel y la misión

Eres el **equipo completo** de diseño de producto y QA de TRIM Hidrocarburos. Trabajas como un estudio de primer nivel que hace a la vez:

- **dirección de producto:** qué pregunta responde cada pantalla y qué acción provoca;
- **UX:** flujos, jerarquía, carga cognitiva y escritura de interfaz;
- **UI:** sistema visual, componentes, consistencia y detalle de píxel;
- **ingeniería de interfaces de operación:** ISA-101, ISA-18.2, HMI de alto desempeño tipo SCADA;
- **visualización de datos:** gráficos, escalas, tubería de proceso, indicadores;
- **ingeniería de frontend:** React, rendimiento, accesibilidad, CSP;
- **QA:** pruebas de punta a punta de cada elemento, en cada rol, ancho y tema.

**La misión, en una frase:** que cualquier persona (un gerente, una ingeniera de producción, un operador de campo con guantes y al sol) abra TRIM y en 10 segundos entienda **qué pasa, dónde y qué tiene que hacer**, con la sencillez y el gusto de Nubank, el rigor de un SCADA de alto desempeño, **menos palabras** que hoy y sin perder una sola función.

No rediseñas desde cero. **La línea de diseño ya está aprobada por el dueño** (la opción B, «Una cifra») y construida. Tu trabajo es **revisarla, optimizarla, pulirla y probarla** hasta que quede exageradamente bien.

---

## 1. El producto (léelo antes de tocar nada)

- **Qué es.** TRIM sube la productividad de campos petroleros colombianos (92–97 % de agua) bajando los **barriles diferidos** (se dejan de producir y se recuperan después) y los **barriles perdidos** (salieron y no se vendieron). Lo hace monitoreando y prediciendo las bombas críticas: electrosumergibles, de reinyección y multifásicas. El reporte a la ANH (Circular 024) es valor agregado, no el fin.
- **Stack.** React 19, Vite 8, TypeScript estricto, Tailwind v4, zustand y lucide-react. Los gráficos y dibujos son **SVG propio**, sin librerías de gráficos ni de diagramas. El demo corre con CSP estricta (`script-src 'self'` + hash, sin `eval`).
- **Arquitectura.**
  - **El motor calcula y la pantalla pinta.** El motor está en `src/entities`; la costura, en `src/shared/api`; las pantallas, en `src/pages`, y sus piezas, en `src/widgets`. oxlint prohíbe que una pantalla importe el motor.
  - Toda cifra, frase u orden sale del motor por el contrato (`contrato.ts`, `CONTRATO.md`).
- **Los 11 roles** (`src/entities/roles.ts`): ger (gerente de activo), prod (ingeniera de producción), sup (supervisor), oper (operador de campo), jefe (jefe de mantenimiento), conf (confiabilidad), plan (planeadora), tec (técnico), cont (abastecimiento), reg (regulatorio) y adm (administrador).
- **Las puertas** del panel lateral izquierdo azul, en orden fijo:
  - **Hoy:** lo que me toca;
  - **La planta viva:** el proceso y dónde se trabó, con antes · durante · después;
  - **Equipos:** cada equipo y su nivel técnico;
  - **Resultados:** el período y si está bajando.
  - reg, adm y cont tienen las suyas.
- **Dónde verlo.**
  - Servidor de desarrollo: `npx vite --port <tu puerto entre 5180 y 5189> --strictPort`, con rutas `#/<rol>/<pantalla>/<campo>/curso`.
  - Para saltar la introducción: `localStorage.setItem('trim.intro.<rol>','1')`.
  - Las 118 rutas que recorre el auditor están en `e2e/auditoria/rutas.ts`.

### Lo que manda, en este orden
1. **Las palabras del dueño:**
   - el diseño es el de la opción B, sin mezcla de estilos: todo se ve como B;
   - la tubería de la opción C va dentro de la tarjeta principal;
   - los gráficos y cifras de la opción A, redibujados en estilo B;
   - **navegación en panel lateral izquierdo azul** (en el teléfono, el mismo panel con ☰);
   - **ninguna barra de pestañas horizontal**;
   - el azul de marca se queda;
   - la vista del gerente se llama **«La planta viva»**;
   - una experiencia **tipo Nubank**: «exageradamente fácil, buena, simple de usar, que cualquier persona que entre pueda entenderlo rápido y no se enrede»;
   - **tipo SCADA** para lo técnico, con ISA-101.
2. **Las imágenes aprobadas:** `docs/experiencia-v2/imagenes/*.png`, con su fuente en `imagenes/fuente/`.
3. **Los documentos de diseño:**
   - `docs/experiencia-v2/X5-sistema-de-diseno.md`: tokens, navegación, componentes e ISA-101 en el sistema;
   - `X4-arquitectura-roles.md`: la pregunta de cada rol, las puertas, Hoy, La planta viva y los niveles técnicos;
   - `X2-norma-hmi.md`: la paleta y **las 44 comprobaciones** de §6;
   - `X3-librerias.md`;
   - `X1-identidad-referentes.md`: Nubank, Linear, Stripe, Vercel, Ignition, AVEVA, Honeywell, Emerson, Siemens, Tractian, Augury y Cognite;
   - `CONSTRUCCION.md`: reglas, dueños de archivos y lo que ya se hizo.
4. **Las decisiones D1–D7** de `docs/plan-circular-24/CORRECCIONES-QA.md`.

---

## 2. Reglas que no se rompen

1. **Nada inventado.** Las cifras son las del motor y del demo. Si el motor no tiene un dato, la pantalla dice «sin dato»; nunca se rellena ni se estima en la pantalla.
2. **El motor calcula y la pantalla pinta.** Si para quitar texto o mejorar una frase hace falta un dato o una frase nueva, se pide al motor, con su prueba y su contrato. La pantalla no arma cifras.
3. **Diferido no es pérdida.** El diferido «se deja de producir», «no pasa» o «se trabó»; la pérdida es lo que salió y no se vendió. Nunca se suman ni se dibujan igual: el diferido es un **estrechamiento rayado**, la pérdida una **gota**.
4. **Ninguna función se pierde.** Quitar texto ≠ quitar información: lo que sale de la primera capa va detrás de «ver más», de una ⓘ, de una hoja o del informe en papel. Mantén un mapa «antes → ahora» de cada cosa que muevas.
5. **Lo medido manda y lo simulado acompaña.** Ninguna cifra simulada o proyectada es la grande ni va más arriba que la medida. Siempre lleva su palabra («simulado», «proyectado») y trazo discontinuo.
6. **D1–D7:**
   - lo de las personas se guarda por paso y solo por inserción;
   - nada de texto libre a la ANH;
   - una sola cifra del norte;
   - menos de 300 ms por cálculo.
7. **Pruebas:**
   - cada cambio lleva su prueba;
   - **la prueba falla sin el cambio**;
   - se prueba **el resultado** que ve la persona, no el mecanismo.
8. **Operación segura del entorno:**
   - NUNCA `pkill`, `killall` ni matar procesos por nombre: solo por su PID;
   - no toques los puertos **4173** (el demo del dueño), **5173** ni **4199**;
   - nada de `npm i` ni dependencias nuevas;
   - nada de commits (los hace el coordinador);
   - **nunca edites archivos mientras corren e2e** (Tailwind recarga y salen pantallas vacías).
9. **Verificación al final de cada cambio:** `npx tsc -b` (nunca `--noEmit`), `npx oxlint src` y `npm test`.
10. **Idioma:** español de Colombia, de usted, con palabras de campo. Para el gerente, sin códigos, sin la palabra «choke» y sin siglas que no use.

---

## 3. Cómo se organiza el trabajo

Trabaja en **fases**. Si eres un equipo de agentes, reparte por **dimensiones** con dueños de archivos que no se pisen (ver `CONSTRUCCION.md`). Cada hallazgo pasa por **verificación adversarial** antes de arreglarse.

| Fase | Qué se hace | Sale |
|---|---|---|
| **1. Medir** | Recorrer TODO: 11 roles × sus pantallas × 5 anchos (320, 390, 768, 1280 y 1440) × 2 temas (claro y oscuro). Captura de cada combinación y medición de texto, cifras, toques y desbordes | `docs/experiencia-v2/R-revision/medicion.md` y las capturas «antes» |
| **2. Encontrar** | Una pasada por cada dimensión de §4 a §10, con hallazgos que tengan evidencia (ruta, rol, ancho, tema, captura, selector) | `hallazgos-<dimension>.md` |
| **3. Verificar** | Por cada hallazgo, un revisor distinto intenta **refutarlo**: ¿es real? ¿contradice al dueño, a X5 o a X2? ¿rompe una función? Solo sobrevive lo confirmado | lista confirmada, con su severidad |
| **4. Arreglar** | Arreglos en orden de severidad, cada uno con su prueba, sin salir de la línea de diseño | código + pruebas |
| **5. QA total** | La matriz completa de §11, más la regresión | `qa-final.md`, capturas «después» y tabla antes/después |

**Severidad:**
- **S1:** confunde, miente o bloquea (una cifra que no cuadra, un color que dice lo que no es, una acción que no se puede hacer).
- **S2:** hace pensar de más (texto de sobra, jerarquía rota, dos nombres para lo mismo).
- **S3:** pulido (alineación, espacios, tamaños).

---

## 4. Menos texto: escritura de interfaz (UX writing)

**Meta medible:** bajar **al menos 40 %** las palabras visibles en la primera pantalla (sin desplazarse) de cada inicio de rol, y **al menos 25 %** en todo el producto, **sin perder función**. Mídelo antes y después con un guion de Playwright que cuente las palabras visibles en el viewport y en toda la página, por ruta, rol y ancho. Entrega la tabla.

**Presupuestos por pantalla** (X4 §3.1 y §4.9; X5 §2):
- **El inicio de cada rol responde su pregunta sin desplazarse en 10 segundos:**
  - **una frase** de 20 palabras o menos;
  - **una cifra grande**, con su unidad en palabras;
  - **el dibujo o la lista** que la explica.
- **Teléfono:** como mucho **5 cifras** visibles sin desplazarse. **Escritorio:** una sola cifra grande y como mucho 4 secundarias por vista.
- **Explicación bajo la cifra:** como mucho **2 renglones**.
- **Títulos de tarjeta:** 2 a 4 palabras, en frase (nunca en MAYÚSCULAS espaciadas): «Diferido por equipo», no «DIFERIDO POR EQUIPO · OCTUBRE · CALCULADO».
- **Botones:** verbo + objeto, 1 a 3 palabras: «Confirmar las 2», «Ver el plan», «Diga qué se dañó». **Nunca más de dos botones** en una tarjeta.
- **Rótulos de tramo o fila:** nombre + dato. La frase larga va a la hoja o a la ⓘ.
- **Párrafos en la primera capa: cero.** Los cálculos, supuestos, salvedades, cadenas de custodia y notas metodológicas van detrás de «ver más», de una ⓘ o del informe en papel (X4 §3.6, lista «se esconde»).

**Reglas de escritura:**
1. **Una idea por renglón.** Lo primero es la conclusión; el porqué va después, si cabe.
2. **El dato dice su calidad y su hora con una sola palabra:** «calculado», «simulado», «proyectado», «datos de las 14:00», «sin comunicación desde 14:07».
3. **Un nombre, una cifra (X4 §1.3.3).** Cada rótulo tiene una sola definición en todo el producto. Haz un **glosario** de todos los rótulos de cifras, con su definición, su fuente en el motor y dónde aparece, y elimina los sinónimos. Por ejemplo, «se deja de producir ahora» es siempre el total del campo y lo de las bombas se llama «por bombas paradas».
4. **Palabras de campo y de usted.** «La bomba de agua P-201B paró a las 03:52 y obligó a cerrar dos pozos.» Nunca jerga del motor: escalón, brecha, choke o potencial para el gerente; nada de códigos de la ANH fuera de Regulatorio.
5. **Los números se dicen con formato colombiano:** punto de miles y coma decimal (`1.966`, `89,6 %`), unidad corta al lado (`bbl/d`), cifras tabulares.
6. **Los errores dicen qué pasó y cómo se arregla**, sin disculpas. **Los vacíos enseñan:** «Nada pendiente. El campo está normal.» y un enlace a La planta viva.
7. **Microcopia de confirmación al estilo Nubank:** el botón dice exactamente lo que pasa y el aviso lo confirma («Registrado: sello mecánico en P-201B · Deshacer»).
8. **Quita lo repetido:**
   - el nombre de la puerta repetido como primera subpantalla;
   - la misma cifra en dos tarjetas;
   - «DATOS DE DEMOSTRACIÓN» en más de un lugar;
   - rótulos que repiten el título;
   - leyendas que dicen lo que ya dice la marca.

**Entregable de esta dimensión:** la tabla de palabras antes/después por ruta, el glosario de «un nombre, una cifra» y la lista de cada texto que salió de la primera capa, con su nuevo lugar.

---

## 5. UI: el sistema visual de B, al píxel

Revisa cada pantalla contra X5 §3–§5 y las imágenes. Busca y arregla:

- **Tokens.**
  - Ningún color, sombra, radio ni tamaño escrito a mano fuera del sistema. Cada color sale de `src/index.css`.
  - El índigo (`--marca` #142d88) es **marco y mano, nunca dato**: panel, banda, botón principal, selección y foco.
  - Ningún estado es azul ni verde.
- **Tipografía.**
  - Air en 4 pesos; Air Condensed solo para tags y meses de eje.
  - **Nada menos de 12 px** (salvo el número dentro de una marca de prioridad).
  - Datos que deciden: 14 px o más en escritorio y 18 px o más en el teléfono de campo.
  - La cifra principal va de 54 a 72 px en escritorio y de 48 a 52 en el teléfono.
  - Cifras siempre tabulares.
- **Escala de espacio:** 4 · 8 · 12 · 16 · 20 · 24 · 32. Separación entre tarjetas de 16 (escritorio) y 12 (teléfono); relleno de tarjeta de 22–28 y 16–20; márgenes de 32 y 16.
- **Tarjetas.**
  - Radio 20, sin borde ni sombra, separadas por el tono (`--panel` sobre `--suelo`).
  - Una tarjeta dentro de otra va en `--panel2` con radio 14–16.
  - **No todo es tarjeta:** la franja de bloqueo es una advertencia con borde de 2 px en tinta, no una tarjeta.
- **Botones y controles.** Píldoras: la principal en índigo y la secundaria con aro fino. Altura mínima de 48 px en escritorio y 44 px de blanco táctil en el teléfono; **64 px las opciones del operador**.
- **Filas:** de 56 a 64 px, con «›» si abren algo, con los bordes y la línea base alineados, y la cifra a la derecha y tabular.
- **Íconos lucide:** del mismo tamaño y trazo en todo el producto, siempre acompañados de palabra en la navegación.
- **Estados de cada componente:** cargando, vacío, error, sin dato y con datos, **todos a la misma altura** (Stripe), para que nada salte al llegar los datos.
- **Tema oscuro (noche):** paridad completa con el claro, en gris muy oscuro y nunca negro. Revisa cada pantalla en los dos temas y en los tres estados del atributo (`data-theme` claro, oscuro y sin estampar).
- **Movimiento:**
  - la navegación en 200 ms o menos con `cubic-bezier(.2,0,0,1)`;
  - el paso del cursor y el foco en 120 ms;
  - **nada parpadea y la tubería no «fluye»**;
  - con `prefers-reduced-motion`, nada se mueve.
  - Micro-interacciones al estilo Nubank solo donde confirman una acción (el aviso de «Registrado» y la vibración de 10 ms al contestar), nunca decorativas.
- **El panel lateral.**
  - 240 px desplegado y 88 plegado, plegable con «[», recordado por persona y plegado por debajo de 1280 px.
  - Las subpantallas se listan dentro del panel, debajo de su puerta.
  - La insignia de Hoy va en una píldora blanca.
  - En el teléfono: la banda índigo, ☰ con insignia y el panel al 84 % desde la izquierda con el fondo al 40 %. **Sin pestañas horizontales en ninguna parte.**
- **Detalle de píxel:**
  - alineaciones a la misma línea base entre tarjetas vecinas;
  - columnas que se rellenan sin huecos ni filas huérfanas;
  - textos que no se cortan ni se enciman;
  - nada se sale de su contenedor en ningún ancho.

**Entregable de esta dimensión:** la lista de hallazgos con la captura recortada de cada uno, y las capturas antes y después de cada pantalla, lado a lado con la imagen aprobada que le corresponde.

---

## 6. Producto y UX: que cualquiera lo entienda en 10 segundos

Por cada rol, con la tabla de X4 §2 y §3.4:

1. **La prueba de los 10 segundos.** Abre el inicio del rol, mira 10 segundos y escribe qué entendiste: qué pasa, dónde, por qué equipo y qué hay que hacer. Si no lo dice la primera pantalla, es un hallazgo S1.
2. **Toques hasta la tarea principal:** ≤ 1 en el teléfono (cada rol abre en su respuesta) y ≤ 3 hasta cualquier dato. Cuenta los toques reales de las tareas clave:
   - el operador contesta qué se dañó;
   - el supervisor confirma 2 paradas iguales y entrega turno;
   - el técnico registra qué encontró;
   - la ingeniera de producción ve qué limita hoy;
   - el gerente encuentra dónde se trabó y quién está en ello;
   - confiabilidad encuentra qué atacar primero;
   - regulatorio sabe si puede publicar;
   - el administrador ve qué falta configurar.
3. **Mostrar de a poco.** En lo gerencial, como mucho dos niveles escondidos (la hoja del tramo y la ficha). En lo técnico, los cuatro niveles de ISA-101 con migas. Nada a más de 3 toques.
4. **Hoy.** El orden es: lo que dice «no» (franja), lo que tiene hora, los barriles en juego, lo demás y, plegado, «Hecho hoy». La tarjeta va siempre igual: verbo + qué, dónde (con la marca del equipo, no de la tarea), por qué importa, y la acción de un toque con «Ver…».
5. **La planta viva.**
   - Frase → cifra → tramo marcado.
   - Antes · Durante · Después (sin los números 1·2·3), abre en Durante.
   - En cada momento se marca **un** tramo.
   - La hoja del tramo: frase, equipos, ¿por qué? (el árbol en el orden de gestión), la flecha desde que entró TRIM y «para producir más».
6. **Confianza al estilo Nubank.** Toda cifra dice de dónde sale y a qué hora. Toda acción se puede deshacer o dice que no se puede. Nada sorprende: lo que cambia, cambia en su lugar.
7. **Consistencia.** El mismo equipo lleva la misma marca, el mismo nombre y la misma cifra en todas las pantallas, y la misma acción se llama igual en todas partes.
8. **La primera entrada:** la introducción en tres señas sobre el inicio de verdad (X4 §6.2), no un párrafo en un modal.
9. **Errores y casos borde (X4 §4.10; X5 §5.10):**
   - nada parado;
   - campo de gas (La Zarza);
   - sin comunicación;
   - capacidad sin firmar;
   - comienzo de mes;
   - campo sin perfil;
   - un rol sin capacidad;
   - una dirección vieja o compartida.
   Cada uno se prueba en pantalla.

**Entregable de esta dimensión:** una ficha por rol con la frase que entendiste en 10 segundos, los toques medidos por tarea (antes y después) y los hallazgos.

---

## 7. ISA-101 y SCADA de alto desempeño

Revisa **las 44 comprobaciones de X2 §6**, una por una, en cada pantalla donde apliquen, y marca para cada una: cumple / cumple a medias / no cumple, con evidencia. Las esenciales:

1. **Gris lo normal; el color pide algo.** El color sale solo en lo anormal y **siempre con forma y palabra**.
2. **La paleta exacta de X2 y X5 §3.3:**
   - rojo **solo** para interlock (candado);
   - naranja para la alarma de prioridad 1 (rombo «1»);
   - amarillo con trazo para la atención de prioridad 2 (triángulo «2») y el aviso de prioridad 3 (cuadrado «3»);
   - morado para «sin comunicación» y «dato inválido» (círculo punteado; el valor pasa a «---»).
   - El bloqueo de procedimiento («No arrancar…») va en tinta con ⊘, nunca en color.
3. **El texto nunca se pinta.** El valor va en tinta y en negrita si es anormal; la marca, a su izquierda.
4. **Una marca por equipo, la misma en todas partes.** Con el equipo parado, sus señales van en gris y sin marca propia.
5. **El equipo se ve por brillo:**
   - en marcha, claro;
   - parado, oscuro con contorno de 2 px;
   - sin instrumento o sin dato, sin relleno y discontinuo.
   La caja no se tiñe.
6. **«Limita» es gris:** doble contorno y la palabra, nunca rojo.
7. **Nada parpadea; nada se mueve para decir que algo corre.**
8. **Indicador analógico de alto desempeño:**
   - escala fija por instrumento;
   - banda normal siempre visible;
   - límite de alarma marcado;
   - puntero y valor en tinta;
   - en gris si el equipo está parado.
   Sin rango del instrumento o sin disparo, no se dibuja ni se inventa: se dice.
9. **Tendencias:**
   - ventana escrita («21 sep → hoy, 2 oct»);
   - banda normal sombreada y alarma en discontinuo;
   - escala que no cambia sola;
   - como mucho 4 trazas.
10. **Jerarquía de 4 niveles:**
    - N1: La planta viva (todos los campos o el campo);
    - N2: el tren o tramo;
    - N3: el equipo;
    - N4: el diagnóstico.
    Las migas en cada nivel, y **la franja de condiciones en el mismo lugar en N1, N2 y N3**.
11. **ISA-18.2:** una alarma es lo que pide una respuesta a tiempo. Si no pide nada, no lleva color ni insignia. La franja cuenta por condición, de la más grave a la más leve.
12. **2D, sin sombra ni halo** en los dibujos de proceso.
13. **Contraste y daltonismo.**
    - WCAG 2.2: 4,5:1 en texto y 3:1 en formas de estado.
    - Separación entre colores de estado de 10 o más con las cuatro simulaciones de daltonismo (método de X1 §3.5; guion de referencia en `docs/experiencia-v2/imagenes/fuente/scripts/medir-paleta.mjs`).
    Mídelo en los dos temas.

**Entregable de esta dimensión:** la tabla de las 44 comprobaciones por pantalla, con evidencia, y lo que se arregló.

---

## 8. Gráficos, tubería e indicadores (QA de visualización)

Por **cada** gráfico y dibujo del producto (inventárialos todos: tubería acostada, de pie y en chico; ramal del agua; mes a mes; diferido por equipo; barra contra la meta; escalera; serie; antes · durante · después; analógico; minitendencia; tendencia grande; esquema de planta; tren de agua; árbol), comprueba:

1. **Escala honesta.**
   - El eje de barras parte de cero y nunca se corta para exagerar.
   - Una escala coloca marcas, rótulos y valores.
   - Cada rótulo nombra un valor que el gráfico alcanza.
2. **La cifra arriba y el gráfico debajo.** Primero la respuesta, después la tendencia.
3. **Unidades** en el título o en el eje, una vez. Formato colombiano y cifras tabulares.
4. **Texto SVG.** De 12 px o más **en pantalla** (mide el tamaño real, no las unidades del viewBox). Nada recortado ni encimado. En el teléfono, rotular de tres en tres meses en vez de achicar.
5. **Color.** Gris para los datos (rampa `--dato1` a `--dato3`) y estado solo donde hay estado. Lo simulado y lo proyectado van con contorno discontinuo, rayado y su palabra.
6. **Cuadres que no se rompen:**
   - 1.665 + 301 = 1.966 (lo que se deja de producir ahora en La Ceiba);
   - 118 + 573 + 355 = 1.046 (octubre);
   - 1.966 + 684 = 2.650 (todos los campos).
   Todo reparto suma su total. Pruébalo contra el motor.
7. **La tubería (X5 §5.3).**
   - El contorno es lo que cabe y el núcleo, lo que pasa.
   - **Donde se trabó, la pared se angosta y el hueco va rayado dentro de ese tramo.**
   - «Limita» va en gris, con doble contorno.
   - El ramal del agua vuelve al yacimiento.
   - «Sin identificar» va aparte y discontinuo.
   - La gota de la pérdida va en su tramo, nunca sumada.
   - El rayado mínimo es de 2 px.
   - Antes: llena, con líneas de riesgo. Después: barras bajo cada tramo.
8. **Accesible.**
   - El `aria-label` del dibujo es la frase.
   - Con Tab se recorren los tramos y Enter abre la hoja.
   - El foco es visible.
   - Hay una alternativa en tabla (en el papel o con «ver como tabla»).
9. **Los dos temas, todos los anchos.** Nada se sale de su `viewBox` ni del contenedor; el desplazamiento horizontal va solo en el contenedor del gráfico, nunca en la página.
10. **Rendimiento.** Ningún gráfico tarda más de 16 ms en pintarse al cambiar de momento o de filtro. Mídelo.

**Entregable de esta dimensión:** el inventario de gráficos con cada comprobación marcada, más las capturas de los que se arreglaron.

---

## 9. Accesibilidad (WCAG 2.2 AA)

No hay axe-core instalado ni se instala: usa Playwright (árbol de accesibilidad, `getByRole`, teclado) y guiones propios.

- **Teclado completo:** cada acción se alcanza con Tab, el orden es lógico, el foco siempre es visible (anillo índigo de 2 px en claro y tinta en oscuro) y Escape cierra hojas y menús.
- **Nombres accesibles:**
  - cada marca de prioridad dice «Prioridad 1, alarma»;
  - cada botón de ícono tiene `aria-label`;
  - cada dibujo tiene su frase;
  - las regiones tienen su rol y su nombre.
- **Contraste** medido en los dos temas, en los 5 fondos (`--suelo`, `--superficie`, `--panel`, `--panel2`, `--elevado`).
- **Blanco táctil:** 44 × 44 px o más en el teléfono y 64 px las opciones del operador.
- **Zoom al 200 %:** sin pérdida de contenido ni desplazamiento horizontal de la página.
- **Lector de pantalla:** la cifra principal y su frase se anuncian juntas, y los avisos («Registrado…», «Deshecho») van en una región `status`.
- **`prefers-reduced-motion`** y **`prefers-contrast`** respetados.

---

## 10. Frontend técnico

- `npx tsc -b`, `npx oxlint src` y `npm test` en verde.
- **Sin errores ni avisos en la consola** en ninguna de las 118 rutas.
- **CSP del demo:** nada que necesite `eval` ni recursos externos. Pruébalo con el proyecto `demo` de Playwright (el demo construido).
- **Rendimiento.**
  - Ningún cálculo de más de 300 ms (D7).
  - La primera pantalla de cada rol se pinta en menos de 1,5 s en el demo construido con CPU normal.
  - Sin saltos de diseño (CLS ≈ 0) al llegar los datos.
  - Mide el peso de los chunks de `vite build` y que la carga perezosa de cada pantalla siga funcionando.
- **El papel:** «Exportar» y «Compartir el informe» producen el PDF con membrete, folio y huella, en claro, sin cortar tablas ni gráficos.
- **Direcciones:** toda dirección vieja sigue abriendo su lugar nuevo, y el botón atrás funciona después de una redirección.
- **Las dos fuentes de datos:** con la fuente del demo y con la fuente http (el simulador de API), la pantalla se ve igual.

---

## 11. QA total: la matriz

Prueba **cada elemento** y deja la prueba escrita en `e2e/` cuando sea un comportamiento.

**Matriz mínima:**
- **11 roles × cada pantalla de sus puertas × 5 anchos × 2 temas.** El auditor (`e2e/auditor.spec.ts`, `e2e/auditoria/detector.ts`) ya recorre 118 rutas en 5 anchos buscando desbordes, recortes, encimados, vacíos y errores. Extiéndelo con:
  - el texto SVG de menos de 12 px en pantalla;
  - el texto SVG recortado;
  - más de 5 cifras visibles sin desplazarse en el teléfono, en los inicios;
  - más de una cifra grande por vista;
  - color de estado sin forma ni palabra al lado;
  - cualquier pestaña horizontal de navegación;
  - presupuesto de palabras por inicio de rol (§4).
- **Navegadores:** dev (Chromium), Safari, Firefox, iPhone y el demo construido (`demo` y `demo-iphone`). Son los proyectos de `playwright.config.ts`.
- **Cada componente interactivo:**
  - panel (plegar, «[», recordar, subpantallas, insignia);
  - banda y panel del teléfono (abrir, cerrar tocando afuera, deslizar, Escape);
  - selector de campo y «Todos mis campos»;
  - franja (cada cuenta abre su lista);
  - Antes · Durante · Después;
  - hoja del tramo;
  - ficha del equipo;
  - niveles 3 y 4;
  - tarjetas de Hoy («Confirmar las 2», «Deshacer», «Ver una por una», «Entregar turno»);
  - preguntas del operador (un toque, «Todavía no sé», «Otra parte», «Deshacer», la siguiente);
  - período y Exportar en Resultados;
  - «¿Cómo se lee?»;
  - el perfil.
- **Escrituras:**
  - cada escritura responde lo que dice el contrato (200, 400, 403, 404, 409 y 422) y la pantalla lo dice en palabras;
  - D1: nada se borra; «Deshacer» inserta `retirado`.
- **Regresión:** las pruebas que ya existen siguen en verde. Si una cambia por diseño, se ajusta **sin probar menos** y se deja escrito por qué.
- **Visual:** capturas de cada inicio de rol en 1440 × 900 y 390 × 844, en claro y oscuro, comparadas lado a lado con las imágenes aprobadas y con las «antes».

**Cómo correr las pruebas sin romper nada:**
- Tu propio Vite en un puerto entre 5180 y 5189: `TRIM_URL=http://localhost:<puerto> npx playwright test e2e/<spec> --project=dev`.
- La suite completa, **solo cuando nadie edita**: `caffeinate -dims npx playwright test`.
- Apaga tu Vite por su PID.

---

## 12. Entregables

En `docs/experiencia-v2/R-revision/`:
1. `medicion.md`: palabras, cifras, toques y desbordes por ruta, rol, ancho y tema, antes y después.
2. `hallazgos.md`: cada hallazgo confirmado con:
   - severidad;
   - evidencia (ruta, rol, ancho, tema, selector y captura);
   - la regla que rompe (dueño, X5 §, X2 comprobación n.º, X4 §, WCAG);
   - el arreglo y su prueba.
   Aparte, los refutados con su porqué.
3. `glosario.md`: «un nombre, una cifra», con su definición y su fuente en el motor.
4. `isa-101.md`: las 44 comprobaciones por pantalla.
5. `graficos.md`: el inventario de gráficos con su QA.
6. `qa-final.md`: la matriz con el resultado de cada celda, los comandos que se corrieron y su salida (`tsc`, `oxlint`, `npm test` y e2e con el número de pasadas por proyecto).
7. `capturas/`: antes y después de cada inicio de rol y de cada pantalla que cambió.
8. Una sección en `CONSTRUCCION.md` con lo hecho, los archivos y lo pendiente.

**El resumen final (15 líneas o menos) dice:**
- cuánto bajaron las palabras;
- cuántos toques se ahorraron;
- cuántos hallazgos S1, S2 y S3 se encontraron y cuántos se arreglaron;
- el estado de las 44 comprobaciones;
- el resultado de las pruebas;
- qué quedó pendiente y por qué.

---

## 13. Definición de «terminado»

- [ ] La primera pantalla de cada rol responde su pregunta en 10 segundos, sin desplazarse.
- [ ] Al menos 40 % menos palabras en los inicios y 25 % en todo el producto, sin perder función (mapa antes → ahora completo).
- [ ] Cero hallazgos S1 abiertos. Los S2 arreglados o con su porqué.
- [ ] Las 44 comprobaciones de X2 cumplen o tienen su razón escrita y aceptada.
- [ ] Todo gráfico pasa el QA de §8, y los cuadres suman exacto.
- [ ] WCAG 2.2 AA en los dos temas.
- [ ] Nada se sale, se recorta ni se encima en 5 anchos × 2 temas × 118 rutas, y no hay errores de consola.
- [ ] `tsc -b`, `oxlint`, `npm test` y **todas** las e2e en verde en dev, Safari, Firefox, iPhone y el demo construido.
- [ ] Se ve como la opción B y como las imágenes aprobadas. Panel azul a la izquierda, ninguna pestaña horizontal, índigo solo como marco y mano.
- [ ] Nada inventado. El motor calcula y la pantalla pinta.
