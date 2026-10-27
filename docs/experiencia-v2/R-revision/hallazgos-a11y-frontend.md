# Hallazgos · Accesibilidad y frontend técnico (R4, §9 y §10 del prompt)

**26-oct-2026 · R4.** Fases 1 y 2: medir y encontrar. No se tocó `src/`, `e2e/` ni `scripts/`; todo lo escrito está en `R-revision/` (este archivo, `herramientas/r4-*.mjs` y `capturas/r4/`).

## Resumen

| | S1 | S2 | S3 |
|---|---|---|---|
| Hallazgos | 1 | 8 | 15 |

- **S1:** en el tema claro el foco no se ve en el panel índigo ni en la banda del teléfono (contraste 1:1). Lo sufren todos los roles, en todas las pantallas.
- **Cumple:**
  - **consola limpia** y **CSP sin violaciones** en las 123 rutas;
  - **zoom al 200 %** sin desplazamiento lateral;
  - **«menos movimiento»** en CSS;
  - **primera pantalla útil de 458 a 511 ms** en el demo construido;
  - **D7** con la CPU normal (el más lento, 115 ms);
  - **el papel:** membrete, folio, huella y paginación en los 7 informes probados;
  - **direcciones viejas:** 13 de 13 casos aplicables, y «atrás» sin rebote.
- **No se pudo medir:** la comparación de las dos fuentes. El simulador del repo (`npm run simulador`) no sirve el contrato de las vistas y, con `VITE_FUENTE=http`, la aplicación no arranca (A9).

## Cómo se midió

**Base.** `main` en 5aaa7f2, con Chromium de Playwright 1.63 (el de `node_modules`); sin axe-core.

**Servidores, todos propios y apagados por su PID al terminar:**
- **5184:** Vite de desarrollo, `VITE_FUENTE=demo npx vite --port 5184 --strictPort` (PID 46962 y su `npx`, 46944).
- **5188, el demo construido:**
  1. `VITE_FUENTE=demo npx vite build --outDir <scratchpad>/r4/dist-r4`;
  2. se arma igual que `scripts/armar-demo.mjs`: `dist` más `demo/servidor.mjs` y `demo/cabeceras.mjs`;
  3. se sirve con `PUERTO=5188 node servidor.mjs` (PID 47023), con la CSP como cabecera y como `<meta>`.
- **5188 y 8791, la fuente http (después):**
  - el build con `VITE_FUENTE=http` se sirvió con `herramientas/r4-servir-http.mjs` (mismas cabeceras, `/api` al simulador);
  - el simulador: `TRIM_DB=<scratchpad>/trim-sim.db PUERTO=8791 node simulador-api/indice.mjs`, para no escribir la base del repo.

**Las rutas.** `e2e/auditoria/rutas.ts` tiene hoy **123** rutas, no 125. Los 9 roles que se ofrecen son ger, prod, sup, oper, jefe, conf, tec, reg y adm. `plan` y `cont` son de v2 (`ROLES_V2`): su dirección cae en producción (ver A-ok).

**Los guiones** (`node docs/experiencia-v2/R-revision/herramientas/<guion> …`, desde la raíz del repo):

| Guion | Qué mide |
|---|---|
| `r4-consola.mjs <url> <etiqueta> hash\|carga <ancho>` | Errores y avisos de consola, excepciones, pedidos fallidos o ≥ 400, violaciones de CSP (`securitypolicyviolation`) y pedidos a otro origen, en las 123 rutas |
| `r4-a11y-estatico.mjs <url> <ancho> <tema>` | Árbol de accesibilidad (CDP): lo interactivo sin nombre, regiones, encabezados, dibujos y su nombre, marcas de prioridad, `aria-*` rotos, clic sin teclado y blancos táctiles |
| `r4-teclado.mjs <url> <ancho> <tema>` | Tab por el inicio de cada rol: indicador de foco, su contraste contra el fondo de alrededor y si algo lo tapa. Escape en 11 cosas que se abren, y dos tareas con el teclado |
| `r4-zoom.mjs <url> <ancho> <alto>` | 640 × 450 (1280 × 900 al 200 %) y 320 × 640: desplazamiento lateral de la página y el detector del auditor (`e2e/auditoria/detector.ts`, tal cual) |
| `r4-movimiento.mjs <url>` | `prefers-reduced-motion`, `prefers-contrast` y `forced-colors` |
| `r4-rendimiento.mjs <url-demo> <freno> <ancho>` | Primera pantalla útil, FCP, LCP, CLS, tareas largas y KB de JS, por rol, sin caché |
| `r4-motor.mjs <url-dev> <freno>` | D7 en el navegador: `pedirPlantaViva`, `pedirHoy`, `pedirResultados` y `pedirListaEquipos` con todos los campos |
| `r4-trozos.mjs <dist> <url-demo>` | Peso de cada trozo (crudo, gzip y brotli), la precarga, los trozos de cada rol y la carga perezosa |
| `r4-papel.mjs <url-demo> <tema>` | «Exportar → PDF» y «Compartir el informe» con `page.pdf()`, revisados con `pdftotext` y `pdftoppm` |
| `r4-direcciones.mjs <url>` | Direcciones viejas y «atrás» después de la redirección |
| `r4-fuentes.mjs <url-demo> <url-http>` | Las dos fuentes |

**Pruebas puntuales:** `r4-panel-foco.mjs`, `r4-hoja-foco.mjs`, `r4-oper-flujo.mjs`, `r4-flechas.mjs` y `r4-papel-oscuro.mjs`.

**Salidas.** Los JSON, los PDF y las capturas de trabajo están en `/private/tmp/claude-501/-Users-hollman/0809a9f7-4f6b-4a1e-b5b0-972baa33e07f/scratchpad/r4/salida/`. Las capturas que sirven de evidencia se copiaron a `capturas/r4/`.

---

## S1

### A1 · En el tema claro, el foco no se ve en el panel índigo ni en la banda del teléfono

**Evidencia.** `r4-teclado.mjs http://localhost:5184 1280 light` y `r4-panel-foco.mjs`, a 1440, 1280 y 390 px. Las paradas medidas en el inicio de los 9 roles:
- **Las puertas y subpantallas del panel** (Hoy, Identificar, Turno, La planta viva, Equipos, Resultados, «¿Cómo se lee?»), **la persona** y **«Plegar el panel»**: `outline: 2px solid rgb(20, 45, 136)` sobre el panel `rgb(20, 45, 136)`. Contraste **1:1**: el anillo índigo sobre fondo índigo no existe.
- **El campo:** la píldora blanca se ve por su propio fondo, pero su anillo tampoco.
- **En el teléfono:** el ☰, la píldora del campo y las iniciales (banda índigo), también 1:1.
- **En oscuro sí se ve:** `--foco` es `#f3f4f5`, de 12:1.

**Capturas:** `capturas/r4/foco-panel-1440-light.png` (el foco está en «La planta viva» y no se distingue) y `foco-panel-1440-dark.png` (el mismo paso, con su anillo).

**Regla:** WCAG 2.4.7 (foco visible, AA) y 1.4.11 (3:1). Además, X5 pide un anillo de 2 px «índigo en claro y tinta en oscuro», pero ese índigo es el mismo del panel.

**Arreglo:** en `src/index.css`, después de `:focus-visible`:

```css
.sobre-marca :focus-visible { outline-color: var(--marca-sobre); }
```

- Agregar la clase `sobre-marca` a:
  - el `<nav>` de `src/widgets/Riel.tsx` (las dos variantes, líneas 169 y 214);
  - la banda de `BandaTelefono` (`src/App.tsx`);
  - la banda de la pregunta de `src/widgets/hoy/Operador.tsx`.
- Prueba e2e: en el tema claro, Tab hasta «La planta viva» del panel y el color del contorno es distinto del fondo del `<nav>` (≥ 3:1).

---

## S2

### A2 · Después de contestar o confirmar en Hoy, el foco se pierde y la pregunta nueva no se anuncia

**Evidencia** (`r4-teclado.mjs` a 1280 y 390, y `r4-oper-flujo.mjs` con el iPhone 14):
- **sup, `#/sup/hoy/ceiba/curso`:** Enter en «Confirmar las 2» → `document.activeElement` es `<body>`. El aviso «Confirmadas LC-07 y LC-16 · Deshacer» sale, pero el foco quedó en ninguna parte.
- **oper, `#/oper/hoy/ceiba/curso` a 390 px:** cada respuesta deja el foco en `<body>`:
  1. Enter en «Sello mecánico» → «¿qué vio?», el foco en `<body>`;
  2. «Fuga hacia afuera» → «Pregunta 2 de 4», el foco en `<body>`;
  3. y así en las cuatro.
- **La pregunta nueva no está en ninguna región viva:** solo se anuncia el aviso «Registrado: …». Chrome sigue el Tab desde donde estaba el botón borrado; Safari y Firefox no lo garantizan (**no verificado** en ellos ni con un lector real).

**Regla:** WCAG 2.4.3 (orden del foco) y 4.1.3 (mensajes de estado); X4: el operador contesta de un toque y pasa a la siguiente.

**Arreglo:**
- En `src/widgets/hoy/Operador.tsx` y `Pregunta.tsx`, al cambiar la pregunta (o el paso «¿qué vio?»), llevar el foco a su título con `tabIndex={-1}` y `ref.focus()`.
- En `src/widgets/hoy/Tarjeta.tsx` y `Hoy.tsx`, al ocultar una tarjeta, llevar el foco a la tarjeta siguiente (su `h3`) o al título de la lista.
- Prueba e2e: después de Enter en una opción, el foco está dentro de `[data-operador]` y no en `body`.

### A3 · El aviso «Deshacer» puede no anunciarse, y sus 5 s no alcanzan con el teclado

**Evidencia:**
- `src/widgets/hoy/piezas.tsx:66-80`: `AvisoDeshacer` devuelve `null` hasta que hay aviso, y entonces monta el `role="status"` **con el texto adentro**. Una región viva que nace con su contenido no se anuncia en NVDA ni en JAWS (**no verificado** con lector real; es el comportamiento documentado de las regiones vivas).
- El botón «Deshacer» está dentro de la región: se lee «Registrado: … en P-201BDeshacer».
- `src/widgets/hoy/envio.ts:51`: el aviso dura `DESHACER_MS` (5 s) y no se detiene con el foco ni con el ratón encima.
- Desde el foco perdido (A2), «Deshacer» está a **7 Tab** (`r4-teclado.mjs`, sup, 1280 y 390).

**Regla:** WCAG 4.1.3 y 2.2.1 (tiempo ajustable). Prompt §9: «los avisos van en una región `status`».

**Arreglo:**
- En `Hoy.tsx`, dejar montado siempre un `<div role="status" aria-live="polite">` vacío y escribir adentro solo el texto. El botón «Deshacer» va al lado, fuera de la región.
- En `envio.ts`, pausar el reloj mientras el aviso tenga el foco o el puntero (`onFocus`/`onMouseEnter`), y reanudarlo al salir.
- Con A2 resuelto, poner «Deshacer» como el siguiente Tab.

### A4 · Al cerrar la hoja del tramo, el foco no vuelve al tramo: queda en `<body>`

**Evidencia** (`r4-teclado.mjs` y `r4-hoja-foco.mjs`, a 1280 y 390, en `#/ger/planta-viva/ceiba/curso`):
1. Tab al tramo «Planta» (`<g role="button">`) y Enter: la hoja se abre con el foco adentro.
2. Escape: la hoja se cierra y el foco queda en `(body)`. El `<g>` sigue conectado y `g.focus()` sí funciona.

**Causa:** `src/shared/ui/foco.ts`, en `useModal`: `const antes = document.activeElement instanceof HTMLElement ? … : null`. Un `<g>` de SVG es `SVGElement`, así que `antes` queda en `null` y el foco no se devuelve.

**A quién afecta:** a todo diálogo que se abre desde un dibujo:
- los tramos y «sin identificar» de la tubería (inicio de ger y prod);
- los nodos del esquema de Planta cuando abren la ficha en el panel (el administrador; **no verificado** en pantalla).

**Regla:** WCAG 2.4.3.

**Arreglo:**
- En `foco.ts`: `const a = document.activeElement; const antes = a instanceof HTMLElement || a instanceof SVGElement ? a : null`, con el tipo `HTMLElement | SVGElement`.
- Prueba e2e: Enter en `[data-tramo="planta"]`, después Escape, y `document.activeElement` es ese `<g>`.

### A5 · Blancos táctiles en el teléfono: varios de menos de 44 px, y algunos de menos de 24

Coincide con UI-18 de R2. Aquí, con la medida de WCAG.

**Evidencia:** `r4-a11y-estatico.mjs http://localhost:5184 390 light`, 21 rutas. Los repetidos en casi todas las pantallas:

| Control | Medida | Dónde |
|---|---|---|
| ☰ | 40 × 40 | todas |
| Iniciales de la persona | 38 × 38 | todas |
| Píldora del campo | 97–159 × 32 | todas |
| Cuentas de la franja | 30 de alto | 20 de 21 rutas |
| «DEMO» | 51 × 24 | — |
| Exportar | 44 × 36 | — |
| Período | 181 × 36 | — |
| Momentos | 102 × 40 | — |

**Bajo 24 px**, que no cumple WCAG 2.5.8 (AA):

| Control | Medida | Dónde |
|---|---|---|
| «Todos mis campos» | 107 × **20** | 13 rutas |
| «Ver la orden» | 96 × **22** | sup, jefe y tec en Hoy |
| «Ver el chat» | 87 × **22** | — |
| «Ver el plan ›» | 75 × **22** y 72 × **20** | La planta viva y Resultados |
| Migas «La Ceiba» y «Agua» | 54 × **22** y 31 × **22** | nivel 3 y 4 |
| «Ver la tubería del agua» | 122 × **18** | prod, Planta y Producción |

**Las opciones del operador sí cumplen:** 76 a 98 px (≥ 64).

**Regla:** X5 §5 (44 px en el teléfono) y WCAG 2.5.8 (24 px).

**Arreglo:**
- `min-h-11` (44 px) por debajo de `sm` en:
  - `Franja.tsx` (los botones de cuenta);
  - `App.tsx` (☰ `size-11`);
  - `MenuPerfil.tsx` (iniciales `size-11`);
  - `Riel.tsx` (`SelectorCampo variante="banda"`);
  - `Cabecera.tsx` (migas, período, Exportar y «DEMO»);
  - `widgets/equipos/Nivel3.tsx` (migas).
- Los enlaces «Ver…» de las tarjetas (`widgets/hoy/Tarjeta.tsx`, `widgets/plantaviva/Filas.tsx`, `widgets/resultados/Tarjetas.tsx`, `pages/Planta.tsx`): `inline-flex min-h-11 items-center`.
- La otra opción es el `::after` de 44 × 44 que propone UI-18.

### A6 · En La planta viva y en el nivel 3, la cifra principal y su frase no se anuncian juntas

**Evidencia:** `r4-a11y-estatico.mjs` a 1280, campo `cifra` del JSON.

**En La planta viva** (inicio de ger y prod), `CifraGrande` (`src/widgets/plantaviva/Heroe.tsx`) pinta tres `<p>` sueltos: «Ahora mismo» / «1.966 barriles por día» / «se dejan de producir en La Ceiba.».
- No hay grupo ni nombre que los junte, y la región que los contiene se llama «La planta viva de La Ceiba».
- Con el lector, «1.966 barriles por día» es una parada y el verbo, otra.
- En el nivel 3 (`#/sup/equipos/ceiba/P-201B`) pasa igual: la región se llama «P-201B: Alarma · parada desde hoy…», sin la cifra.

**Hoy y Resultados sí lo hacen:** su región se llama «Se dejan de producir 1.966 bbl/d. Le faltan 4 paradas…» y «En octubre no se produjeron 1.046 bbl en La Ceiba…».

**Regla:** prompt §9 («la cifra principal y su frase se anuncian juntas») y WCAG 1.3.1.

**Arreglo:**
- En `Heroe.tsx`: `<div role="group" aria-labelledby={`${idCifra} ${idFrase}`}>`, con `id` en el `<p>` de la cifra y la unidad y en el de la frase.
- Lo mismo en el héroe de `src/widgets/equipos/Nivel3.tsx`.
- Prueba: el `ariaSnapshot` del grupo contiene «1.966 barriles por día se dejan de producir».

### A7 · A 320 px, «Sus instrumentos» del diagnóstico obliga a desplazar la página de lado

**Evidencia:** `r4-zoom.mjs http://localhost:5184 320 640`, 123 rutas; 121 limpias.
- `#/conf/equipos/ceiba/P-201B/diagnostico`: `.vista` se desplaza **+97 px**.
- `#/conf/equipos/morichal/MPP-301/diagnostico`: **+177 px**.
- El culpable son las filas `button.flex.w-full` de `FilaDispositivo` (`src/widgets/PanelEquipo.tsx:240-275`). Tienen anchos fijos (tag, nombre, minitendencia de 96 px y valor de 84 px) y no se acomodan.

**Regla:** WCAG 1.4.10 (reflujo a 320 px, AA). El auditor no lo ve porque su ancho mínimo es 390.

**Arreglo:**
- En `FilaDispositivo`, la minitendencia con `max-[400px]:hidden` y la fila con `flex-wrap`.
- Agregar 320 a una corrida del auditor, o una prueba de reflujo en `e2e/`.

### A8 · Impreso con el tema oscuro, el papel sale con márgenes negros y el folio del pie no se lee

**Evidencia:** `r4-papel.mjs http://127.0.0.1:5188 dark` y `r4-papel-oscuro.mjs`. Con `trim.tema = dark` y «Compartir el informe» en La planta viva:
- antes del PDF se dispara `beforeprint` (con eso, `data-theme` pasa a `light`);
- el contenido sale claro, pero **el área de los márgenes del `@page` sale negra**;
- el pie «Folio INF-2026-0001 · … · Página 1 de 2» queda gris sobre negro.

**Captura:** `capturas/r4/papel-claro-vs-oscuro.png`, con el claro, el oscuro tras `beforeprint` y el oscuro sin él.

**Causa:** `index.html` y `store.ts` ponen `document.documentElement.style.colorScheme = 'dark'`, y el `beforeprint` de `store.ts:459` solo cambia `data-theme`.

**No verificado** con el diálogo de impresión real («Guardar como PDF»). Se midió con `page.pdf({ printBackground: true })`, que usa el mismo camino de impresión de Chrome. `print-color-adjust: exact` (index.css) hace que los fondos salgan aunque la persona apague «gráficos de fondo».

**Regla:** prompt §10 («en claro»); el folio es la prueba del informe.

**Arreglo:**
- En `src/app/store.ts:459`: en `beforeprint`, también `document.documentElement.style.colorScheme = 'light'`; `aplicarTema` lo devuelve en `afterprint`.
- En el `@media print` de `index.css`: `:root { color-scheme: light !important; }`.

### A9 · Las dos fuentes no se pueden comparar: con `VITE_FUENTE=http` y el simulador, la aplicación no arranca

**Evidencia:** `r4-fuentes.mjs http://localhost:5184 http://127.0.0.1:5188 1280`, 16 rutas (los 9 inicios y 7 pantallas).
- Con la fuente http, las 16 quedan en blanco con «**TRIM no pudo arrancar: ruta no encontrada**» (`capturas/r4/fuente-http-no-arranca.png`).
- Al arrancar hay 6 respuestas **404**: `/api/campos`, `/api/catalogo`, `/api/configuracion/historial`, `/api/paradas/respuestas`, `/api/usuarios` y `/api/usuarios/historial`.
- `simulador-api/api.mjs` solo atiende el registro de la cadena de datos: `/api/salud`, inscripción, ingesta, inventario y tags. **No sirve el contrato de las vistas.**
- El Vite de desarrollo responde igual: `curl localhost:5184/api/campos` → 404.
- La única prueba de la fuente http es `scripts/verificar-contrato.mjs --http`, con un servidor dentro del proceso (`probarHttp`, `fetch` reemplazado). No pinta pantallas.

**Regla:** prompt §10 («con la fuente del demo y con la fuente http, la pantalla se ve igual»). Por eso queda **no medible**. Además, prompt §4, regla 6: el mensaje de error no dice qué ruta faltó ni qué hacer.

**Arreglo:**
- Pasar el servidor de `probarHttp` (`responder(srv)` con la sesión del demo) a `simulador-api/` como manejador de los GET de `contrato.ts`. Así `npm run simulador` sirve las vistas y la comparación se puede hacer y automatizar (`r4-fuentes.mjs` queda listo).
- En `src/main.tsx`, el mensaje con la ruta y el estado: «TRIM no pudo arrancar: GET /api/campos respondió 404. Revise VITE_API_URL o que el backend esté arriba.».
- Mientras tanto, dejar escrito en `CONSTRUCCION.md` que la fuente http se prueba solo por contrato.

---

## S3

### A10 · `aria-controls` apunta a un id que no existe mientras el desplegable está cerrado

**Evidencia:** `r4-a11y-estatico.mjs`, en las 21 rutas medidas, por ejemplo:
- `aria-controls=_r_0_` en «Campo: La Ceiba. Cambiar de campo»;
- `_r_1_` en la persona;
- `_r_2_` en la franja, el período y Exportar.

El panel solo existe abierto.

**Regla:** WCAG 4.1.2 (validez de ARIA).

**Arreglo:** en `src/shared/ui/foco.ts`, `useDesplegable`: `'aria-controls': abierto ? id : undefined`.

### A11 · La marca «DEMO» no tiene nombre en el teléfono y Escape no cierra su nota

**Evidencia:**
- A 390 px, el árbol de accesibilidad da un `button` **sin nombre** en 20 de 21 rutas: el texto largo está oculto (`max-sm:hidden`) y «DEMO» lleva `aria-hidden`.
- `r4-teclado.mjs`: «Marca DEMO: Escape cierra **false**» (a 1280 y a 390).

**Regla:** WCAG 4.1.2 y 1.4.13; prompt §9 (Escape cierra).

**Arreglo:** en `src/widgets/Cabecera.tsx`, `MarcaDemo`:
- `aria-label="Datos de demostración"` en el botón;
- abrirla con `useDesplegable` (Escape, clic afuera, `aria-controls`).

### A12 · El título del documento es siempre «Trim · Hidrocarburos»

**Evidencia:** `document.title` es igual en las 21 rutas medidas (`r4-a11y-estatico.mjs`). Ningún archivo de `src/` asigna `document.title`. En una pestaña o en el historial, todas las pantallas se llaman igual.

**Regla:** WCAG 2.4.2 (A).

**Arreglo:** en `src/App.tsx`, `useEffect(() => { document.title = `${PANTALLAS[pantalla]?.titulo} · ${campo.nombre} · TRIM` }, …)`.

### A13 · No hay enlace para saltar al contenido

**Evidencia:**
- En el escritorio hay de 7 a 9 paradas del panel antes de la primera de la vista. El supervisor necesita 10 Tab hasta «DATOS DE DEMOSTRACIÓN» y 16 hasta «Confirmar las 2».
- Hay regiones `navigation` y `main`, así que pasa WCAG 2.4.1 por ellas, pero quien usa el teclado sin lector no tiene atajo.

**Arreglo:**
- En `src/App.tsx`, como primer hijo: `<a href="#contenido" className="sr-only focus:not-sr-only …">Saltar al contenido</a>`, con `id="contenido" tabIndex={-1}` en `.vista`.
- Ojo con el enrutador por hash: que el enlace haga `focus()` sin cambiar `location.hash`.

### A14 · Al cerrar la introducción, el foco queda en `<body>`

**Evidencia:** `r4-teclado.mjs`, rol oper sin `trim.intro.oper`: el diálogo abre con el foco adentro y Escape lo cierra, pero el foco termina en `(body)`.

**Regla:** WCAG 2.4.3.

**Arreglo:** en `src/widgets/Onboarding.tsx`, al cerrar, `document.querySelector('main h1')?.focus()`, con `tabIndex={-1}` en el `h1` de `Cabecera.tsx`.

### A15 · Los encabezados saltan niveles

**Evidencia:** `r4-a11y-estatico.mjs`, lista de encabezados:
- La planta viva y Hoy: `h1` → `h3`, sin `h2`;
- diagnóstico: `h1` → `h4` → `h5` («POR QUÉ PARÓ…»);
- Causa: `h1` → `h5` («Señal», «WhatsApp»);
- Configuración: `h2` en MAYÚSCULAS.

**Regla:** WCAG 1.3.1 (buena práctica de estructura).

**Arreglo:** los títulos de tarjeta van como `h2`:
- `widgets/plantaviva/piezas.tsx`;
- `widgets/hoy/Tarjeta.tsx` y `Lateral.tsx`;
- `widgets/arbol/*` (los `h5`);
- `widgets/equipos/Nivel4.tsx`.

### A16 · Los nombres para el lector dicen «bbl/d», y las marcas, «Prioridad 1 · alarma»

**Evidencia:**
- **Nombres de región y de dibujo con abreviaturas,** aunque la pantalla diga «barriles por día»:
  - la región del inicio de Hoy: «Se dejan de producir 1.966 bbl/d.…»;
  - la tubería: «Se dejan de producir 1.966 bbl/d: P-201B…»;
  - las barras del mes a mes: «Noviembre 2025: 249 bbl/d…»;
  - Resultados: «… 1.046 bbl …».
  - Un lector las deletrea («be be ele barra de»).
- **Las marcas se llaman «Prioridad 1 · alarma».** El prompt pide «Prioridad 1, alarma»; el punto medio lo leen unos lectores como «punto medio».

**Regla:** prompt §9 y X5 (unidad en palabras).

**Arreglo:**
- En el motor, las frases de `aria-label`: `ariaLabel` de `entities/planta-viva.ts`, la frase de la región de `entities/hoy.ts` y `entities/resultados.ts`, y `widgets/resultados/MesAMes.tsx`. Que usen «barriles por día» y «barriles», con su prueba en `verificar-libro.mjs`.
- `src/shared/lib/prioridad.ts`: `'Prioridad 1, alarma'`, `'Prioridad 2, atención'` y `'Prioridad 3, aviso'`. Revisar antes que ninguna e2e busque el texto con «·».

### A17 · Cajas con ayuda que reciben el foco sin rol

**Evidencia:** `r4-teclado.mjs` a 390, `#/ger/resultados/ceiba/curso`:
- paradas 37 a 41: `div «Equipos de alto impacto 573 bbl 55 %»`, «Con parte vigilada»… (las filas de «Dónde bajarlo», `widgets/diferidos/Paretos.tsx:223`);
- y las ⓘ como `span[role=img]` con foco.
- `src/shared/ui/Tip.tsx:68` pone `tabIndex 0` en el envoltorio sin darle rol.

**Regla:** WCAG 4.1.2.

**Arreglo:** en `Tip.tsx`, cuando reciba el foco y no tenga `onClick`, `role="button"` con `aria-describedby` (ya lo pone al abrir) y `aria-expanded`. O que las filas usen `aLaVista` con una ⓘ aparte.

### A18 · El desplazamiento suave por código no respeta «menos movimiento»

**Evidencia:**
- `r4-movimiento.mjs`: con `reducedMotion: reduce` no queda ninguna animación ni transición de más de 10 ms, ni en reposo, ni en el panel del teléfono, ni en la hoja. **Cumple en CSS.**
- Pero hay `scrollIntoView({ behavior: 'smooth' })` en `src/pages/Planta.tsx:228` y `src/pages/Riesgo.tsx:235`, y la regla de CSS no lo alcanza.

**Regla:** prompt §5 y §9, WCAG 2.3.3.

**Arreglo:** `behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'`.

### A19 · `prefers-contrast` no tiene ninguna regla, y con colores forzados se pierden los botones y lo escogido

**Evidencia:**
- `r4-movimiento.mjs`: 0 reglas con `prefers-contrast` o `forced-colors`. Con `contrast: 'more'`, los tokens no cambian.
- Con `forcedColors: 'active'` (`capturas/r4/colores-forzados-ger-1280.png`):
  - «Ver qué se está haciendo» y «Compartir el informe» quedan como texto suelto, sin píldora ni borde (el aro es un `box-shadow`);
  - el momento escogido (Durante) no se distingue;
  - el logo blanco del panel desaparece.

**Regla:** prompt §9 (`prefers-contrast` respetado) y WCAG 1.4.11 en el modo de alto contraste.

**Arreglo** en `src/index.css`:
- `@media (prefers-contrast: more) { :root { --tinta2: var(--tinta); --tinta3: #3a3f45; --linea: #8a8f95 } }`, con sus valores de oscuro;
- `@media (forced-colors: active) { button, [role=button] { border: 1px solid ButtonText } [aria-checked=true], [aria-current], [aria-selected=true] { outline: 2px solid Highlight } }`;
- el logo blanco con `forced-color-adjust: none`.

### A20 · CLS de 0,054 al abrir Equipos (inicio de confiabilidad)

**Evidencia:** `r4-rendimiento.mjs http://127.0.0.1:5188 1 1280`, rol conf (`#/conf/equipos/morichal`): CLS **0,0545** en las 5 cargas.
- A los 220 ms, la cabecera (franja y Exportar) llega después del «Cargando…» de la vista y la empuja hacia abajo.
- Los otros 8 inicios dan de 0,0006 a 0,0012. A 390 px, todos dan 0.

**Regla:** prompt §10 (CLS ≈ 0).

**Arreglo:** que la cabecera tenga su alto reservado mientras carga: un `fallback` de `Suspense` en `App.tsx` con la misma altura que `Cabecera`, o la cabecera fuera del `Suspense` perezoso.

### A21 · El papel: dibujos separados de su título o su leyenda

**Evidencia:** `r4-papel.mjs http://127.0.0.1:5188 light`, hojas en `scratchpad/r4/salida/papel-light/`:
- **Resultados del gerente** (4 hojas): «Dónde se trabó» se parte entre la hoja 2 y la 3. La barra queda en la 2 y su leyenda («en el yacimiento · en los pozos · …») en la 3 (`capturas/r4/papel-resultados-corte-hojas-2-3.png`).
- **Producción** (9 hojas):
  - «La tubería del campo»: el título y la descripción al pie de la hoja 1, el dibujo en la 2;
  - «Qué limitó, día por día»: el título al pie de la hoja 5, la gráfica en la 6.
- **Lo que no se rompe:** ninguna tabla ni SVG pasa del ancho del papel, y ningún `<svg>` se parte por dentro (`break-inside: avoid`).

**Regla:** prompt §10 («sin cortar tablas ni gráficos»).

**Arreglo** en el `@media print` de `src/index.css`:
- `section:has(> svg, .overflow-x-auto > svg) { break-inside: avoid }` para las tarjetas de menos de una hoja;
- `h2, h3, section > header { break-after: avoid }`;
- en `widgets/resultados/Tarjetas.tsx` («Dónde se trabó»), la barra y su leyenda en un mismo bloque con `break-inside: avoid`.

### A22 · El trozo `costura` pasa de 500 kB y se precarga para todos

**Evidencia:**
- `vite build`: `costura-X_y8FtCz.js 519.62 kB │ gzip: 173.25 kB` y el aviso «(!) Some chunks are larger than 500 kB» (`scratchpad/r4/salida/vite-build-demo.log`).
- `index.html` lo precarga junto a `react` y `librerias`: 835 KiB crudos y 263 de gzip antes de la primera pantalla.
- Cada rol baja de 1.240 a 1.340 KiB de JS sin comprimir (`servidor.mjs` no comprime).
- Con la CPU 4× hay tareas largas de hasta 478 ms (tabla de abajo).
- No rompe el 1,5 s con la CPU normal.

**Arreglo** (de bajo riesgo primero):
- comprimir en `demo/servidor.mjs` (gzip o brotli por `accept-encoding`), y que el despliegue lo haga;
- partir `costura` por vista en `vite.config.ts` (un grupo por `shared/api/<vista>` con su motor), cuidando la nota del ciclo con el auxiliar de CommonJS que ya está en ese archivo.

### A23 · D7 en un teléfono de gama media: Resultados de todos los campos, 443 ms

**Evidencia:**
- `r4-motor.mjs http://localhost:5184 4` (CPU 4×), mediana de 3 páginas nuevas:
  - `pedirResultados` (ger, 5 campos), primera llamada: **443 ms** (peor 458);
  - `pedirHoy` (jefe, 5 campos): 275 ms;
  - `pedirPlantaViva` (5 campos): 267 ms.
- Con la CPU normal, los cuatro van de 49 a 115 ms (tabla de abajo).

**Regla:** D7 dice «con la CPU normal» (`CORRECCIONES-QA.md:47`), así que **cumple**. Se anota como riesgo para el operador y el supervisor en el teléfono.

**Arreglo:** ninguno obligatorio. Si se quiere margen: calcular Resultados por campo y sumar, o hacerlo en un `requestIdleCallback` después de pintar la cifra.

### A24 · En el demo construido, Conectores le pide a `/api` lo que el demo no sirve

**Evidencia:** `r4-consola.mjs http://127.0.0.1:5188 demo carga 1280`.
- En `#/adm/conectores/ceiba/curso` y `…/morichal/…`, `GET /api/campos/<campo>/inventario` y `/tags/pendientes` responden `200 text/html` (la página).
- `pedirJson` lo convierte en `SIN_SERVICIO`. En desarrollo, el simulador sí responde JSON.
- Sin errores de consola. **No se miró en pantalla** qué dice la tarjeta del registro en el demo; por el código es «no hay un servicio conectado en esta instalación que responda esa ruta».

**Regla:** prompt §6.9 (los vacíos enseñan) y §10 (dos fuentes).

**Arreglo:** en `src/shared/api/registro.ts`, con `FUENTE === 'demo'`, responder el registro de demostración (o decir «En el demo no hay bordes conectados» con un enlace a Configuración), en vez de pedirlo a un servidor que no existe.

---

## Lo que se probó y cumple

**Consola.** 0 errores y 0 avisos en las 123 rutas:
- dev a 1280 y 390, cambiando el hash;
- demo construido a 1280 con carga nueva por ruta, y a 390 cambiando el hash.
- Lo único anotado son los `net::ERR_ABORTED` de los dos pedidos de Conectores al salir de la pantalla (el `AbortController` cancela a propósito).
- Una corrida de dev a 390 se cortó una vez con «Execution context was destroyed» (una recarga de la página); **no se repitió** en la segunda corrida.

**CSP en el demo construido:**
- 0 violaciones (`securitypolicyviolation`) y 0 pedidos a otro origen en las 123 rutas;
- `script-src 'self' 'sha256-…'`, sin `unsafe-eval`, en cabecera y en `<meta>`;
- en `dist/assets/*.js`, ningún `eval(` ni `new Function`; los únicos `http://` son los espacios de nombres de SVG y MathML de React y `react.dev/errors`;
- las fuentes se sirven del propio origen.

**Nombres accesibles:**
- 0 controles sin nombre a 1280, en claro y oscuro (21 rutas), y 1 a 390 (A11);
- las marcas que no son decorativas tienen nombre: 51 de prioridad 1, 16 de prioridad 2, 7 de prioridad 3 y 16 «Normal»;
- los dibujos tienen su frase, como la tubería: `role="group"`, «Se dejan de producir 1.966 bbl/d: …», con sus 5 tramos enfocables;
- los indicadores analógicos son `role=img`, con valor, banda y «equipo parado».

**Teclado:**
- Escape cierra la lista de la franja, el período, la persona, el campo, Exportar, la ficha del equipo, la hoja del tramo, la introducción, la ⓘ y el panel del teléfono;
- el foco vuelve al botón que abrió, salvo en A4 y A14;
- el foco queda dentro de los diálogos;
- los momentos (`radiogroup` «Momento») y las pestañas de Configuración (`tablist`) se mueven con las flechas;
- fuera del panel índigo, el anillo da de 3,8:1 a 15,8:1 contra el fondo de alrededor.

Nota para R2: Configuración es una barra de pestañas horizontal (`role=tablist`, 4 pestañas). A11y la maneja bien, pero el dueño dijo «ninguna barra de pestañas horizontal».

**Zoom al 200 %** (640 × 450): en las 123 rutas, 0 con desplazamiento lateral de la página y 0 hallazgos del detector del auditor. A 320 px fallan 2 (A7).

**«Menos movimiento» en CSS:** nada se mueve (A18 es lo de JS). Las opciones del operador miden de 76 a 98 px.

**Direcciones:**
- 13 de 13 casos aplicables abren su lugar nuevo, por enlace y por dirección compartida; «atrás» vuelve a donde se estaba y «adelante» no rebota;
- el campo ajeno lo dice: «Usted no tiene asignado el campo Morichal Norte: le mostramos La Ceiba.»;
- `#/prod/equipo/…` va al inicio de producción: producción nunca tuvo Superficie, así que la prueba esperaba mal; para jefe y conf, la ruta del auditor `#/jefe/equipo/ceiba/curso/K-101` abre bien;
- `#/plan/…` (rol de v2) cae en producción.

**El papel:** 7 informes en el demo construido, en claro y oscuro:
- planta viva del gerente, Resultados de un campo y de todos, Producción, Regulatorio, Turno y la ficha de P-201B;
- todos llevan membrete (empresa, «TRIM · HIDROCARBUROS», período, quién y la configuración firmada), folio `INF-2026-000n`, huella SHA-256 con sus cifras protegidas, «Página n de m» con el folio al pie y «DATOS DE DEMOSTRACIÓN»;
- nada pasa del ancho del papel;
- de 2 a 9 hojas.

**Carga perezosa:** abrir Resultados baja `Resultados`, `tramos`, `reparto`, `Paretos`, `BarraMeta`, `PorCampo` y `Diaria`; Equipos baja `Equipos` y `piezas`; volver a La planta viva no baja nada.

---

## Tiempos medidos

**Primera pantalla útil en el demo construido.** Se mide desde que empieza la navegación hasta que `<main>` tiene más de 80 caracteres y no queda «Cargando…». Es la mediana de 5 cargas sin caché a 1280 y de 3 a 390, servidas en 127.0.0.1 sin compresión (`r4-rendimiento.mjs`).

| Rol (inicio) | 1280 · CPU 1×: lista / FCP / LCP | CLS | Tareas largas (peor) | 390 · CPU 1× | 390 · CPU 4× | 390 · CPU 4×, peor tarea larga |
|---|---|---|---|---|---|---|
| ger (La planta viva) | **474** / 180 / 484 ms | 0,0007 | 1 (53 ms) | 469 ms | 777 ms | 220 ms |
| prod (La planta viva) | **504** / 204 / 512 | 0,0007 | 1 (80) | 499 | 862 | 310 |
| sup (Hoy) | **505** / 220 / 512 | 0,0012 | 1 (102) | 492 | 953 | 455 |
| oper (Hoy) | **508** / 212 / 516 | 0,0009 | 1 (95) | 491 | 938 | 466 |
| jefe (Hoy) | **504** / 220 / 520 | 0,0008 | 1 (102) | 489 | 941 | 415 |
| conf (Equipos) | **511** / 212 / 520 | **0,0545** | 1 (103) | 508 | 1.031 | 478 |
| tec (Hoy) | **476** / 184 / 488 | 0,0006 | 1 (69) | 489 | 817 | 292 |
| reg (Reporte) | **470** / 160 / 484 | 0,0009 | 0 (50) | 458 | 808 | 271 |
| adm (Configurar) | **474** / 172 / 172 | 0,0009 | 1 (53) | 465 | 811 | 256 |

- **Meta del prompt:** menos de 1,5 s con la CPU normal. **Cumple** en los 9 roles, aun con la CPU 4×.
- **No medido:** red lenta, un teléfono físico, Safari y Firefox.

**D7: el motor en el navegador.** Dev en 5184, después de arrancar en Configuración del administrador; mediana de 3 páginas nuevas (`r4-motor.mjs`).

| Cálculo, con los 5 campos | CPU 1×: primera / guardada | Otra consulta parecida | Un campo | CPU 4×: primera |
|---|---|---|---|---|
| `pedirPlantaViva` (Durante) | **79** / 0,0 ms | Antes y Después: 0 ms | 10 ms (Morichal) | 267 ms |
| `pedirHoy` (jefe) | **79** / 13,5 | conf: 11 | 4 (sup en La Ceiba) | 275 |
| `pedirResultados` (ger) | **113** / 0,1 | jefe, con relojes y vigía: 9 | 10 (prod en La Ceiba) | **443** |
| `pedirListaEquipos` | **49** / 10,0 | nivel 3 de P-201B: 2 | 4 (Morichal) | 161 |

Con la CPU normal, el peor es de 115 ms: **cumple D7** (< 300 ms). Con 4×, ver A23.

## Peso de los trozos (`vite build`, fuente del demo)

Lo que imprime Vite, en kB = 1.000 bytes (`scratchpad/r4/salida/vite-build-demo.log`). La precarga sale de `dist/index.html`.

| Trozo | Crudo | gzip | Cuándo se baja |
|---|---|---|---|
| `costura` (motor y API) | **519,62 kB** (pasa el límite de 500) | 173,25 | precarga, todos |
| `datos` (insumos del demo) | 286,40 | 41,00 | al arrancar (import dinámico), todos |
| `react` | 218,84 | 68,25 | precarga, todos |
| `arranque` | 143,29 | 39,82 | al arrancar, todos |
| `Configuracion` | 118,67 | 33,42 | Configurar (adm) |
| `Causa` | 70,66 | 19,31 | Identificar |
| `index.css` | 68,62 | 13,94 | precarga, todos |
| `Equipos` | 61,58 | 16,93 | Equipos (conf al inicio) |
| `Produccion` | 48,45 | 14,23 | Producción |
| `librerias` (lucide, zustand…) | 46,02 | 15,69 | precarga, todos |
| `PlantaViva` | 41,93 | 11,70 | ger y prod al inicio |
| `Resultados` | 27,30 | 8,00 | Resultados |
| `Turno` | 23,19 | 7,46 | Turno |
| `Hoy` | 18,11 | 5,86 | sup, oper, jefe y tec al inicio |
| `Regulatorio` | 10,57 | 3,95 | reg al inicio |

**Totales** (`r4-trozos.mjs`, en KiB):
- **JS:** 1.965 KiB crudos, **570 de gzip** y 484 de brotli, en 56 archivos.
- **Precarga de `index.html`:** 835 KiB crudos y 263 de gzip.
- **Primera pantalla de cada rol:** de 17 a 20 trozos de JS, de 1.240 a 1.340 KiB sin comprimir.
- **Con `VITE_FUENTE=http`:** no hay trozo `datos` y `costura` baja a 468,29 kB (157,71 de gzip; `vite-build-http.log`).
