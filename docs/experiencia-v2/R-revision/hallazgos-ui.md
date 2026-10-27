# Hallazgos · UI al píxel (R2, §5 del prompt)

**26-oct-2026 · R2 · UI y producto.** Fases 1 y 2: medir y encontrar. No se tocó `src/`, `e2e/` ni `scripts/`.

## Cómo se midió

- **Vite propio** en 5182 (sobre `main`, 5aaa7f2), Chromium de Playwright de `node_modules`, la introducción saltada con `trim.intro.<rol>`.
- **La matriz:** 85 rutas (cada pantalla de cada puerta de los 9 roles que se ofrecen, más los niveles 3 y 4 y la ficha del gerente) × 1440 × 900 y 390 × 844 × claro y oscuro = **340 cargas**, 0 fallas y 0 errores de consola. Por cada carga hay una captura de la primera pantalla y otra de la página entera, y un guion dentro de la página que mide:
  - los textos de menos de 12 px (también en SVG, con su escala real);
  - los textos de estado pintados;
  - el índigo como dato y cualquier azul o verde;
  - el radio, el borde, la sombra y el relleno de cada tarjeta;
  - la separación entre tarjetas vecinas;
  - los botones que no son píldora o quedan bajos;
  - los botones por tarjeta;
  - las pestañas (`role=tablist` y tiras de 3 o más controles marcados);
  - el desborde de la página y de `.vista`;
  - el texto cortado con «…»;
  - las animaciones y transiciones de más de 200 ms;
  - las cifras de 32 px o más, con y sin desplazarse.
- **Las interacciones:**
  - el panel (240/88, «[», el recuerdo, 1280 y 1024, la insignia, los íconos plegados);
  - el teléfono (abrir, Escape, tocar afuera, deslizar, escoger);
  - las tareas;
  - los casos borde;
  - la introducción;
  - «menos movimiento».
- **Los guiones** están en el scratchpad de la sesión (no son entregables): `capturar.cjs`, `auditar.js`, `interacciones.cjs`. Si R1 los quiere en `herramientas/`, se copian tal cual.
- **Comparado contra** las 7 imágenes aprobadas y X5 §3–§5.

## Lo que cumple (no es hallazgo)

- **Panel del escritorio:**
  - 240 px desplegado y 88 plegado;
  - «[» pliega y despliega, y se recuerda por rol tras recargar (`trim.riel.<rol>`);
  - a 1280 px abre desplegado y a 1024 plegado;
  - la insignia de Hoy es una píldora blanca con número en `#15171a`;
  - la transición del ancho dura 0,2 s con `cubic-bezier(.2,0,0,1)`.
- **Panel del teléfono:**
  - mide 328 px (84 % de 390), con el velo `rgba(10,12,16,.40)` y la entrada en 200 ms;
  - se cierra con Escape, deslizando a la izquierda y al escoger una puerta (la falla de «tocar afuera» va en UI-02).
- **«Menos movimiento»:** la animación del panel baja a 0,001 ms. En las 340 cargas no hay ninguna animación infinita ni ninguna transición de más de 210 ms. Nada parpadea.
- **Color:**
  - ningún texto va pintado con un color de estado;
  - el índigo aparece solo en el marco y la mano. La raya de «Durante» en «Lo que todavía se puede mover» la pide X5 §5.4 («la del momento escogido, en índigo»);
  - no hay estados azules ni verdes (salvo las casillas nativas: UI-10).
- **Pestañas:** no hay ninguna de navegación arriba ni abajo en las puertas (salvo Configuración: UI-01).
- **Desborde:** la página no se desplaza de lado en ninguna de las 340 cargas (salvo el nivel 4 a 390 px: UI-03).
- **Paridad con las imágenes:**
  - La planta viva del gerente (La Ceiba y «Todos mis campos»), en claro y oscuro, coincide con las imágenes 1, 2 y 6 (tokens, tarjetas, tubería y filas de A);
  - Hoy del supervisor coincide con 3a y 3b.

---

## S1

Ninguno de pura UI. Los S1 son de producto: `hallazgos-producto.md`.

## S2

### UI-01 · Pestañas horizontales en Configuración y Filosofía
- **Evidencia:**
  - **Dónde:** `#/adm/configuracion/ceiba/curso` y `#/adm/filosofia/…` (también ger, prod y conf: 14 cargas).
  - **Anchos y temas:** 1440 y 390, los dos temas.
  - **Selector:** `div[role="tablist"][aria-label="Partes de la configuración"]`.
  - **Qué hay:** cuatro pestañas, «Configuración técnica · Filosofía operacional · Metas de los campos · Usuarios y accesos», debajo del título. En el teléfono, dos renglones de píldoras.
  - **Además:** el panel lista sus propias subpantallas («Configuración», «Conectores»). Son dos navegaciones para lo mismo.
  - **Capturas:** `capturas/hallazgos/ui-01-pestanas-configuracion-1440.png`, `ui-01-pestanas-configuracion-390.png`.
- **Regla:** el dueño: «ninguna barra de pestañas horizontal». X5 §4.1 («Arriba no queda ninguna pestaña») y CONSTRUCCION.md («Las subpantallas no van en pestañas horizontales: se listan dentro del panel azul»).
- **Arreglo:**
  - en `src/app/pantallas.tsx`, que `configurar` liste como subpantallas «Configuración técnica», «Filosofía operacional», «Metas de los campos», «Usuarios y accesos» y «Conectores». `filosofia` ya tiene su dirección propia; harían falta `metas` y `accesos` como pantallas con dirección, sobre la misma `Configuracion`;
  - quitar el `role="tablist"` de `src/pages/Configuracion.tsx:106-115`;
  - al gerente, «Metas y accesos» ya le llega por el menú de la persona.
  - **Prueba e2e:** ningún `[role=tablist]` visible en `#/adm/configuracion/…`, y cada parte se abre desde el panel.

### UI-02 · Tocar afuera no cierra el panel del teléfono, la hoja del tramo ni la hoja inferior
- **Evidencia:**
  - **Dónde:** `#/ger/planta-viva/ceiba/curso`.
  - **El panel del teléfono (390):** se abre con ☰ y se toca en (375, 500), sobre el velo. El panel sigue abierto. `document.elementFromPoint` devuelve el contenedor y el velo lleva `inert=""`.
  - **La hoja del tramo (1440 y 390):** se toca afuera y sigue abierta; con Escape se cierra.
  - **Capturas:** `capturas/hallazgos/ui-02-panel-telefono-no-cierra-390.png` y `ui-02-hoja-tramo-no-cierra-1440.png`.
- **Causa:** `src/shared/ui/foco.ts:17-27` (`inertes`) marca `inert` a todo hermano del diálogo, y el velo es hermano del diálogo en:
  - `src/App.tsx` (`PanelTelefono`, l. 93);
  - `src/shared/ui/HojaInferior.tsx:20`;
  - `src/widgets/plantaviva/HojaTramo.tsx:27`.

  Un elemento `inert` no recibe el clic. En `PanelEquipo` y `Onboarding` el velo está dentro del diálogo, y ahí sí cierra.
- **Regla:** X5 §4.2 («Se cierra tocando afuera»). En el prompt, §11 («cerrar tocando afuera»). `e2e/armazon.spec.ts` no lo prueba (no busca «afuera»).
- **Arreglo:**
  - en `foco.ts`, saltar al hermano que lleve `data-velo` (`if (hermano.hasAttribute('data-velo')) continue`) y ponerle `data-velo` a los tres velos;
  - o poner la `ref` de `useModal` en el contenedor `fixed inset-0`, como hace `PanelEquipo`.
  - **Prueba e2e:** a 390, abrir ☰, `touchscreen.tap` en x = 370, el diálogo desaparece. Lo mismo con la hoja del tramo a 1440 (clic a la izquierda del panel).

### UI-03 · Nivel 4 a 390 px: «Sus instrumentos» se sale 27 px y los valores quedan cortados
- **Evidencia:**
  - **Dónde:** `#/conf/equipos/ceiba/P-201B/diagnostico`, 390, los dos temas.
  - **Medida:** `.vista` con `scrollWidth − clientWidth = 27`.
  - **Selector:** `button.flex.w-full…rounded.border` («PI-2010 Presión de succión…»). Termina en x = 417, con la columna `span.w-[84px]` de valor en 406.
  - **Qué se ve:** «18,2 psi», «bbl/d» y «sin fuga» cortados en el borde.
  - **Captura:** `capturas/hallazgos/ui-03-diagnostico-instrumentos-cortados-390.png`.
- **Regla:** X5 §5 «Detalle de píxel» (nada se sale de su contenedor en ningún ancho). Prompt §5.
- **Arreglo:** en `src/widgets/PanelEquipo.tsx` (`Instrumentos`, la fila con `w-[84px]`), a menos de 640 px:
  - la minitendencia pasa a su propio renglón, o se quita (`max-sm:hidden`);
  - el texto lleva `min-w-0`.
  - **Prueba e2e:** a 390 en esa ruta, `.vista.scrollWidth <= clientWidth`.

### UI-04 · Las pantallas «de antes» no se ven como B
- **Evidencia (medida en las 340 cargas):**
  - **Separación entre tarjetas de 9 a 11 px** (`mb-2.5`) en vez de 16 y 12, en:
    - Bombas, Electrosumergibles, Pozos, Identificar (`causa`), Turno, Mi trabajo, Mantenimiento;
    - Confiabilidad, Diferidos, Producción, Planta, Agua;
    - Regulatorio, Configuración, Filosofía, Conectores y Perfil.
  - **Títulos en MAYÚSCULAS espaciadas**, por ejemplo:
    - «SIN INSTRUMENTO», «CAPTURANDO DATOS», «CONFIGURADOS SIN DATOS», «PERFIL DEL CAMPO», «TANQUES DE AGUA»;
    - «PARADAS PROGRAMADAS», «HORAS EN SAP», «ABIERTO EN SAP», «SISTEMAS CORPORATIVOS», «TAGS REGISTRADOS»;
    - «SALUD POR PARTE», «HISTORIA DEL PLC», «PUNTOS CIEGOS», «SAP · MANTENIMIENTO», «VERSIONES FIRMADAS»;
    - y la ficha ejecutiva «P1 · ALARMA».
  - **Títulos de 13 px con tracking .04em en `--tinta2`** («Se deja de producir ahora, por causa», «Árbol de causas · como la circular», «Por equipo»). Sale del `Panel` de `src/shared/ui/primitivas.tsx:31`.
  - **Rellenos de 12 y 16 px** y **radios de 3 y 4 px** dentro de tarjetas (Agua `section.rounded-[3px]`, Producción, Planta, nivel 4).
  - **Chips con aro oscuro** («bomba de reinyección», «ya pasó el límite», «sube», «no arrancar»).
  - **Letra monoespaciada** («ZS-2011 · marcha → paro», los tags de Configuración y del nivel 4).
  - **Captura:** `capturas/hallazgos/ui-04-riesgo-pantalla-de-antes-1440.png` (Riesgo de confiabilidad: la tarjeta «Si falla hoy» con relleno de 12 px y cabecera con raya, el rótulo condensado y espaciado a la derecha, y los chips).
- **Regla:**
  - el dueño: «todo se ve como B, sin mezcla de estilos»;
  - X5 §3.4 (rótulos sin mayúsculas espaciadas; Air y Air Condensed);
  - X5 §3.5 (escala 4·8·12·16·20·24·32; relleno de 22 a 28 y de 16 a 20);
  - X5 §5.2 (título de 15 a 16 px Semibold en tinta; una tarjeta dentro de otra con radio de 14 a 16).
- **Arreglo, por pantalla (F2 y F3 según su dueño):**
  - cambiar `section.mb-2.5.rounded.border…` por la `Tarjeta` de `primitivas.tsx`;
  - el `Panel` con título de 15 a 16 Semibold en `--tinta`, en frase (cambiarlo en `primitivas.tsx:31` arregla de una vez todo lo que lo usa);
  - la rejilla con `gap-4` (escritorio) y `gap-3` (teléfono);
  - quitar `font-mono` de los tags (`font-cond`);
  - los chips con `Chip`.
  - **Antes de cambiar los títulos**, F4 tiene que ajustar las aserciones en MAYÚSCULAS de `e2e/auditoria/rutas.ts` («ÁRBOL DE CAUSAS · COMO LA CIRCULAR», «TANQUES DE AGUA», «CAPTURANDO DATOS», «HORAS EN SAP», «SALUD POR PARTE», «PUNTOS CIEGOS», «HISTORIA DEL PLC», «SISTEMAS CORPORATIVOS», «POR EQUIPO», «VIGÍA»…).
  - **Prueba:** la regla nueva del auditor que detecta mayúsculas espaciadas y la separación fuera de la escala.

### UI-05 · Identificar contesta con botones de 25 a 32 px y radio de 2 a 4; Hoy, con opciones de 64 px en píldora
- **Evidencia:**
  - **Dónde:** `#/sup/causa/ceiba/curso` (también oper, tec, prod, jefe y conf), a 1440.
  - **Medidas:** las partes («Sello mecánico · 5 de 8 fallas») miden 25 px de alto con radio 4. Las causas («Se dañó un equipo», «Se fue la energía»…), 32 px con radio 4. A 390 suben a 48 px, todavía con radio 4.
  - **Hay además:** un `<select>` nativo «O escoja cualquier parte…» y un botón «Registrar respuesta» a todo lo ancho.
  - **El mismo bloqueo, otra forma:** «No arrancar» va en una tarjeta redondeada sin el borde de 2 px en tinta, como renglón suelto.
  - **Captura:** `capturas/hallazgos/ui-05-identificar-opciones-1440.png`.
- **Regla:**
  - X5 §5.8 (opciones de 64 px o más, título de 18 px);
  - X5 §5 «Botones y controles» (píldoras, 48 px en escritorio);
  - X5 §5.6 (el bloqueo, en tinta con borde de 2 px);
  - prompt §6.7 (la misma acción se ve y se llama igual).
- **Arreglo:**
  - en `src/widgets/arbol/Preguntas.tsx:11` (`OPCION`) usar la opción de `src/widgets/hoy/Pregunta.tsx` (64 px, radio 16, círculo a la derecha), o directamente el componente `Pregunta`;
  - en `src/pages/Causa.tsx` usar `Bloqueo` de `widgets/hoy/piezas.tsx`.

### UI-06 · Panel plegado: las subpantallas son íconos sin palabra, y dos usan el mismo ícono
- **Evidencia:**
  - **Dónde:** `#/jefe/resultados/ceiba/curso`, plegado, a 1440.
  - **Qué se ve:** las subpantallas son «Resultados» (`chart-column`), «Diferidos» (`activity`), «Confiabilidad» (`activity`) y «Mantenimiento» (`scale-3d`). Dos destinos distintos con el mismo dibujo, y ninguno con palabra visible (solo `aria-label` y `title`). Igual en Hoy («Hoy, Identificar, Turno») y en La planta viva de confiabilidad («La planta viva, Planta, Agua, Riesgo»).
  - **Captura:** `capturas/hallazgos/ui-06-plegado-iconos-repetidos-1440.png`.
- **Regla:**
  - prompt §5: «Íconos lucide… siempre acompañados de palabra en la navegación»;
  - X5 §4.1 (plegado: «Ícono con su nombre debajo, a 12 px»).
- **Arreglo:**
  - en `src/app/pantallas.tsx`, darle a `confiabilidad` otro ícono (por ejemplo, `ShieldCheck` o `Target`) y a `resumen`, si se queda, uno que no sea el `Gauge` de Equipos;
  - en `src/widgets/Riel.tsx` (rama `plegado`, subpantallas), poner el nombre a 12 px bajo cada ícono, como las puertas (y quedan de 66 px de ancho).

### UI-07 · Nivel 4: las señales de P-201B parada llevan ◆1 y punta naranja; en el nivel 3, gris y sin marca
- **Evidencia:**
  - **Dónde:** `#/conf/equipos/ceiba/P-201B/diagnostico`, «Sus instrumentos».
  - **Qué se ve:** FI-2011, II-2011 y PDI-2011 con el rombo «1», y su minitendencia termina en un punto naranja. En el nivel 3 de la misma bomba («Sus señales»), las 8 van en gris y sin marca.
  - **Capturas:** `capturas/hallazgos/ui-03-diagnostico-instrumentos-cortados-390.png` (las marcas) contra `ui-07-nivel3-senales-en-gris-1440.png`.
- **Regla:** X2 E3 y B9 (con el equipo parado, sus señales en gris y sin marca propia); X5 §6.4. Se le pasa a R3 para la tabla de las 44.
- **Arreglo:** en `src/widgets/PanelEquipo.tsx` (`Instrumentos`) y en `src/shared/ui/Sparkline.tsx`, cuando el equipo está parado, no pintar la marca por señal ni el punto de color (la misma condición que usa `Senales` del nivel 3, `src/widgets/equipos/Senales.tsx`).

## S3

### UI-08 · Exportar y el período fuera de su lugar; Exportar con solo el ícono
- **Evidencia (texto visible de la cabecera, 1440):**
  - **Exportar en pantallas «ahora»:** Equipos (todos los roles), Riesgo, Turno, Servicios y proceso, Conectores, Perfil y el nivel 3.
  - **Selector de período donde no se lee período:** Configuración y Filosofía («Octubre, en curso» sobre un formulario), Planta, Agua, Bombas, Electrosumergibles, Pozos e Identificar.
  - **Solo el ícono:** en el teléfono, Exportar queda como un botón de ícono (descarga), sin palabra y en un renglón propio (Equipos, Turno, nivel 3); en el escritorio, también en el nivel 3.
  - **Capturas:** `capturas/hallazgos/ui-08-periodo-en-configuracion-1440.png`, `ui-08-exportar-solo-icono-390.png`.
- **Regla:**
  - X4 §3.1, regla 8 (el período, solo en Resultados);
  - X4 §3.5 (Exportar en Resultados, Reporte, Evidencia y la ficha);
  - prompt §5 (el ícono con palabra).
- **Arreglo:**
  - en `src/app/pantallas.tsx`, `sinExportar: true` en `equipos`, `riesgo`, `turno`, `equipo`, `conectores` y `perfil`;
  - `ahora: true` en `configuracion`, `filosofia`, `planta` y `agua` (si su vista no lee el período; Bombas, Esp, Pozos y Causa sí lo leen hoy: se quedan hasta fundirse);
  - en `src/widgets/informe/Exportar.tsx`, dejar la palabra visible también en el teléfono.

### UI-09 · El aviso «Deshacer» se pierde en el tema oscuro
- **Evidencia:**
  - **Dónde:** `#/sup/hoy/ceiba/curso`, oscuro, tras «Confirmar las 2».
  - **Medida:** el fondo del aviso es `#15171a` sobre un suelo `#1a1d21` y una tarjeta `#262a2f`. Solo la sombra lo separa (1,1:1 contra el suelo).
  - **Captura:** `capturas/hallazgos/ui-09-aviso-oscuro-390.png`.
- **Regla:** prompt §5 (paridad del tema oscuro); X5 §3.5 (lo que flota lleva `--sombra-flota` y se distingue).
- **Arreglo:** en `src/widgets/hoy/piezas.tsx:72-76`, cambiar `bg-[#15171a]` y `text-[#c9d1f0]` por tokens: un `--aviso` y un `--aviso-sobre` en `src/index.css`, con `#15171a` en papel y `--elevado` (#2e3238) en noche, y «Deshacer» en `--marca-tenue`.

### UI-10 · Colores fuera de los tokens
- **Evidencia:**
  - **Hex sueltos para el oscuro:** `src/widgets/plantaviva/Momentos.tsx:32` y `src/widgets/equipos/piezas.tsx:37` usan `[:root[data-theme=dark]_&]:text-[#464b52]`.
  - **Otro índigo:** el avatar de Perfil usa `--color-marca-1` (#12287a), que no es `--marca` (#142d88). Es el único azul que detectó el guion (`span.font-cond.size-12 «HL»`, en `#/adm/perfil/…`).
  - **Casillas en el azul del sistema:** las casillas de Configuración son nativas, en el azul del navegador; no hay `accent-color`.
  - **Tres velos distintos:** `bg-black/35` (PanelEquipo), `rgb(10 12 16/.40)` (panel del teléfono, hojas) y `/.45` (introducción).
  - **Capturas:** `capturas/hallazgos/ui-10-casilla-nativa-azul-1440.png`.
- **Regla:** prompt §5 «Tokens» (cada color sale de `src/index.css`; ningún estado azul).
- **Arreglo:**
  - en `src/index.css`:
    - `:root{accent-color:var(--primario)}`;
    - un token `--primario-tenue` para el lema del momento escogido;
    - un token `--velo: rgb(10 12 16 / .40)`;
  - usarlos en los cuatro archivos;
  - el avatar, en `--marca`.

### UI-11 · Espacios y radios fuera de la escala en lo nuevo
- **Evidencia:**
  - **Hoy, entre tarjetas:** 13, 14 y 15 px (`gap-[14px]`, `src/pages/Hoy.tsx`), en vez de 16 (escritorio) y 12 (teléfono).
  - **Hoy, relleno de las tarjetas:** 18/24 (X5: 22 a 28). Las laterales, 16/20, y las de La planta viva, 16/22.
  - **Resultados:** una separación de 17.
  - **El nivel 3 en el teléfono:** 16 en vez de 12.
  - **La lista de Equipos:** relleno de 12/24/8/24.
  - **El héroe de La planta viva en el teléfono:** radio 18 en vez de 20 (`section.rounded-[18px]`).
  - **Capturas:** `capturas/hallazgos/ui-11-hoy-separacion-14-1440.png`, `ui-11-heroe-radio-18-390.png`.
- **Regla:** X5 §3.5 y §5.2.
- **Arreglo:**
  - `src/pages/Hoy.tsx`: `gap-3 sm:gap-4`;
  - `src/widgets/hoy/Tarjeta.tsx`: `sm:px-6 sm:py-[22px]`;
  - `src/widgets/plantaviva/*`: `rounded-[20px]` también en el teléfono;
  - `src/widgets/equipos/Lista.tsx`: `pt-5 pb-4`.

### UI-12 · La planta viva del gerente no cabe en 1440 × 900 como la imagen 1
- **Evidencia:**
  - **Dónde:** `#/ger/planta-viva/ceiba/curso`, 1440 × 900.
  - **Qué se ve:** la fila «Aviso · producción por día, bajo la meta · 10.700 de 10.900» queda cortada abajo, y en la columna lateral «¿Está bajando?» también.
  - **Por qué:** suman la píldora «DATOS DE DEMOSTRACIÓN» en las migas y el renglón de la pérdida bajo la tubería. La imagen 1 cabe entera (X5 §8.1, N1).
  - **Captura:** `capturas/hallazgos/ui-12-planta-viva-no-cabe-1440.png`.
- **Regla:** X5 §8.1, N1; prompt §13 («Se ve como … las imágenes aprobadas»).
- **Arreglo:**
  - poner la pérdida como leyenda de la tubería, en la misma línea que el ramal (`widgets/plantaviva/Tuberia.tsx`), o en «Este mes»;
  - y la marca DEMO a la derecha del título, sin sumar renglón (`widgets/Cabecera.tsx`).

### UI-13 · El nivel 3 contra la imagen 4
- **Evidencia:**
  - **Dónde:** `#/sup/equipos/ceiba/P-201B`.
  - **A 1440, con el panel desplegado:**
    - «DATOS DE DEMOSTRACIÓN» en un renglón propio entre las migas y el tag;
    - la descripción en dos renglones («· datos de las 14:00» sola);
    - los nombres de señal en dos renglones («Presión de / succión»);
    - «normal 66.800 – / 89.250» partido.
  - **A 390:**
    - el rombo ◆1 queda solo en un renglón y «Alarma · parada desde…» en el siguiente;
    - el secundario «Crear aviso en SAP» va antes del principal «Diga qué se dañó».
  - **Capturas:** `capturas/hallazgos/ui-13-nivel3-cabecera-1440.png`, `ui-13-nivel3-marca-huerfana-390.png`.
- **Regla:**
  - imagen 4 (panel plegado, una cabecera de dos renglones);
  - X5 §5.6 (la marca siempre al lado de su palabra);
  - X5 §5.1 (el principal primero).
- **Arreglo:** en `src/widgets/equipos/Nivel3.tsx`:
  - la marca y su palabra en un `inline-flex` sin salto;
  - en el teléfono, el principal arriba;
  - la marca DEMO a la derecha del tag;
  - y que el nivel 3 pliegue el panel solo mientras está abierto, sin tocar lo recordado. Esto último es opcional y lo decide el dueño.

### UI-14 · «Por equipo» del gerente (Equipos) es el widget de antes
- **Evidencia:**
  - **Dónde:** `#/ger/equipos/ceiba`, a 1440.
  - **Qué se ve:**
    - el título «Por equipo» en 13 px espaciado;
    - los chips con aro («bomba de reinyección», «sin identificar», «energía eléctrica»);
    - SE-2 con un punto «•» de «normal» en una lista que no es mixta;
    - el párrafo suelto «Lo que se le carga a cada equipo en octubre…» sobre el suelo.
  - **Captura:** `capturas/hallazgos/ui-14-por-equipo-gerente-1440.png`.
- **Regla:** X5 §5.4 («Diferido por equipo: una fila por equipo, con la marca y su palabra, el tag en Air Condensed, la familia, los barriles, el porcentaje y una barra de 5 px») y §5.5 («Sin condición, no lleva marca, ni el punto»).
- **Arreglo:** en `src/widgets/equipos/Gerente.tsx`, usar las filas de `widgets/plantaviva/Lateral.tsx` («Diferido por equipo», que ya son de B) en lugar de `Paretos`.

### UI-15 · Letra fuera de la regla
- **Evidencia:**
  - **Air Condensed fuera de los tags y los meses:** «SIN INSTRUMENTO» y «2 bombas» (Bombas), «PARADA» y «casi iguales» (Agua), «bbl · el diferido del libro» (Diferidos), «de lo que más le quita al campo…» (Riesgo), «DISCRETA» (nivel 4).
  - **Monoespaciada:** Configuración («TK-AG-CE · lo vacía P-201B · nivel ahora 89,6 %»), Identificar, nivel 4 y la ficha.
  - **Cifras de 36 a 40 px, entre la secundaria (20 a 26) y la principal (54 a 72):** Turno «983» (36), Diferidos «1.046» (40), Mantenimiento «573» (36).
  - **Capturas:** `capturas/hallazgos/ui-15-condensada-sin-instrumento-bombas-1440.png`, `ui-15-mono-y-mayusculas-1440.png`.
- **Regla:** X5 §3.4.
- **Arreglo:** en las pantallas de UI-04, `font-cond` solo en los tags; quitar `font-mono`; las cifras de esas tarjetas a 26 px o, si son la de la vista, de 54 a 72.

### UI-16 · Texto de SVG de 7,2 px: el «?» de las marcas de Filosofía
- **Evidencia:**
  - **Dónde:** `#/adm|prod|conf/filosofia/ceiba/curso`, a 1440 (6 por carga).
  - **Selector:** `button > span > svg > text «?»`.
  - **Captura:** `capturas/hallazgos/ui-16-marca-interrogacion-7px-filosofia-1440.png` (a la izquierda de «SE-2»).
- **Regla:** X5 §3.4 (nada menos de 12 px, salvo el número de una marca de prioridad; el «?» no lo es).
- **Arreglo:** en `src/widgets/configuracion/marcas.tsx:33`, dibujar la marca de «propuesta» con una forma sin texto (un círculo con punto, por ejemplo) y dejar la palabra «propuesta de TRIM», que ya va al lado.

### UI-17 · Textos cortados con «…»
- **Evidencia:**
  - **Regulatorio, 1440 y 390:** las calibraciones («Verificado contra cinta el 3 de marzo de 2026 · vi…», «Probado el 12 de abril de 2026 · factor 1,0021 · v…», «Analizador…», «Densitómetro…»).
  - **Configuración, 390:** «Morichal Norte».
  - **Captura:** `capturas/hallazgos/ui-17-texto-cortado-regulatorio-1440.png`.
- **Regla:** prompt §5 («textos que no se cortan»).
- **Arreglo:** en `src/pages/Regulatorio.tsx`, que esas líneas pasen a dos renglones (`whitespace-normal`) o detrás de una ⓘ.

### UI-18 · Blancos táctiles de menos de 44 px en el teléfono
- **Evidencia (390, en casi todas las rutas):**
  - la franja: 30 px de alto;
  - la píldora del campo: 32;
  - ☰: 40;
  - la persona: 38;
  - Antes, Durante y Después: 40;
  - los filtros de Equipos: 40;
  - el período: 36;
  - «Ver el plan ›»: 22;
  - «Todos mis campos» en las migas: 20;
  - la marca DEMO: 24.
  - **Captura:** `capturas/hallazgos/ui-18-blancos-tactiles-390.png`.
- **Regla:** X5 §5 «Botones y controles» (44 px de blanco táctil en el teléfono). Se le cruza a R4 (WCAG 2.5.8).
- **Arreglo:**
  - un `::after` de 44 × 44 en los controles de menos de 44 px (`src/widgets/Franja.tsx`, `Riel.tsx` `SelectorCampo variante="banda"`, `App.tsx` ☰, `plantaviva/Momentos.tsx`, `Cabecera.tsx`);
  - o subirlos a `min-h-11` en `max-sm`.

### UI-19 · Más de dos botones en una tarjeta
- **Evidencia:**
  - **«La tubería del campo»** (`#/prod/produccion/ceiba/curso` e Identificar): cuatro botones, «Ver como tabla · Abrir · Identificar · Ver por dónde se trabó». Es además una segunda tubería, la de antes (ver P-16).
  - **Planta, «CAPTURANDO DATOS»:** seis «Ubicar».
  - **Conectores, «TAGS»:** «Aplicar las 3» y tres «Asociar».
  - **Captura:** `capturas/hallazgos/ui-19-cuatro-botones-tuberia-produccion-1440.png`.
- **Regla:** X5 §5.1 y prompt §4 («Nunca más de dos botones en una tarjeta»).
- **Arreglo:** las acciones por fila pasan a filas con «›» (`Fila` de `primitivas.tsx`); la tubería de antes sale de Producción (P-16).

### UI-20 · El bloqueo «No arrancar» con «Plan simulado…» adentro
- **Evidencia:**
  - **Dónde:** `#/sup/hoy/ceiba/curso`, 390 (y en oscuro), después de «Confirmar las 2».
  - **Qué se ve:** la franja de bloqueo suma «Plan simulado: volver antes de 39 h (2.072 bbl), y 2 planes más».
  - **Captura:** `capturas/hallazgos/ui-20-bloqueo-con-plan-390.png`.
- **Regla:**
  - X5 §5.6 (el bloqueo dice el «no» y nada más);
  - prompt §2.5 (lo simulado acompaña en su tarjeta, no dentro de una advertencia).
- **Arreglo:** en `src/widgets/hoy/piezas.tsx` (`Bloqueo`), no pintar `b.planes`. Cuando la tarjeta del equipo ya no está, la línea de planes va como su propio renglón debajo del bloqueo.

### UI-21 · La banda del operador: «Pregunta 1 de 4» en un renglón aparte
- **Evidencia:**
  - **Dónde:** `#/oper/hoy/ceiba/curso`, 390.
  - **Qué se ve:** la banda del ☰ lleva el campo y la persona; debajo, otro renglón con «Pregunta 1 de 4» a la derecha. La imagen 5 los pone en la misma banda («☰ trim … Pregunta 1 de 4»). Son unos 50 px más antes de las opciones.
  - **Captura:** `capturas/hallazgos/ui-21-banda-operador-390.png`.
- **Regla:** imagen 5; X5 §5.8.
- **Arreglo:** en `src/App.tsx` (`BandaTelefono`), cuando la vista es `[data-operador="pregunta"]`, mostrar el paso en lugar del campo; `src/widgets/hoy/Operador.tsx` deja de pintar `[data-paso]`.

### UI-22 · «DATOS DE DEMOSTRACIÓN» en mayúsculas espaciadas
- **Evidencia:**
  - **En todas las cargas de escritorio** (85 de 85), en mayúsculas con tracking.
  - **En el nivel 3** ocupa su propio renglón (UI-13).
  - **Captura:** `capturas/hallazgos/ui-13-nivel3-cabecera-1440.png`.
- **Regla:** X5 §3.4; prompt §4.8. El texto lo ve R1.
- **Arreglo:** en `src/widgets/Cabecera.tsx` (`MarcaDemo`), «Demostración» en frase, a 13 px, sin tracking.

### UI-23 · La primera subpantalla repite el nombre de su puerta
- **Evidencia:**
  - **Dónde:** el panel, a 1440.
  - **Qué se ve:**
    - «Hoy › Hoy · Identificar · Turno»;
    - «La planta viva › La planta viva · Planta · Agua»;
    - «Equipos › Equipos · Bombas · …»;
    - «Resultados › Resultados · Diferidos · …».
  - **Captura:** `capturas/hallazgos/ui-23-subpantalla-repite-puerta-1440.png`.
- **Regla:** prompt §4.8 («el nombre de la puerta repetido como primera subpantalla»); CONSTRUCCION C1, pendiente.
- **Arreglo:** en `src/widgets/Riel.tsx` (`usePuertas`), la primera subpantalla se llama como su vista y no como la puerta: «Lo de hoy», «El campo», «La lista», «El período»; o no se lista y la puerta misma la abre. El texto lo decide R1.

### UI-24 · Sin `data-theme` (localStorage bloqueado), el sistema oscuro no se respeta
- **Evidencia:**
  - **Revisado en el código, no en pantalla:** `index.html` estampa `data-theme` dentro de un `try`. Si `localStorage` lanza un error, no se estampa nada.
  - **`src/index.css`** solo tiene `:root` (claro) y `:root[data-theme="dark"]`, sin `@media (prefers-color-scheme: dark)`.
  - **Con el sistema en oscuro** y el almacenamiento bloqueado, la aplicación sale en claro.
- **Regla:** prompt §5 («en los tres estados del atributo»).
- **Arreglo:**
  - en `src/index.css`, `@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ …los mismos valores de noche… } }`;
  - o en `index.html`, estampar con `matchMedia` antes del `try` de `localStorage`.

---

## Resumen

| Severidad | Hallazgos |
|---|---|
| S1 | 0 |
| S2 | 7: UI-01 a UI-07 |
| S3 | 17: UI-08 a UI-24 |
