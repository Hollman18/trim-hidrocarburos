# Arreglos de F1 · Armazón, Hoy y lo común

**26-oct-2026 · F1.** Fase 4 de `PROMPT-REVISION-UX.md`: los hallazgos confirmados de F1 en `verificados-v1.md` (§3 y §4) y `verificados-v2.md` («Los arreglos, por dueño»), en orden de severidad.

**Pruebas nuevas:**
- `e2e/arreglos-f1.spec.ts`: 32 pruebas de comportamiento, cada una mira lo que ve la persona.
- `scripts/verificar-contrato.mjs`, sección C3, punto 9 «F1 · Revisión»: 9 comprobaciones del motor de Hoy.

**Pruebas que cambiaron por diseño (sin probar menos):**
- `hoy.spec.ts`: los planes en su tarjeta, la insignia 4, el paso en la banda, la parte de un toque, «Se registra en 5 s».
- `armazon.spec.ts`: la primera subpantalla ya no se lista; el `aria-label` de «sin comunicación» dice su alcance.
- `interfaz.spec.ts`: las tres pruebas de la introducción, que ya no es modal.
- `arbol-identificar.spec.ts`: «Cierre de hoy» con la cuenta una vez; «bomba de agua».
- `correcciones-f3.spec.ts`: «Contestar»; se abre la parada LC-21.
- `carril.spec.ts`: «Datos de demostración»; la fila de LC-08; Mi trabajo, ahora en Hoy; `h3` en Identificar.
- `experiencia-f2c.spec.ts:30`: «Sin causa» en frase.
- `verificar-libro.mjs:1335`: la etiqueta «P1 · alarma».
- La sección C3 de `verificar-contrato.mjs`: la insignia, el orden con «Decidir 3 planes», «Entre las 2», el técnico.

**Referencia:** se regeneraron solo los 18 casos `referencia/hoy/*`. Los demás que no coinciden (`agua-choke`, `choke/criticidad`, `equipos/lista`) son del motor de F2 y F3.

**Corrido** contra Vite en 5181:
- `arreglos-f1`, `hoy`, `armazon`, `interfaz`, `arbol-identificar`, `correcciones-f3` y `carril`, en dev; `arreglos-f1` e `interfaz` también en Firefox; las de 390 px, en iPhone.
- Todo en verde (la última vuelta de `arreglos-f1`, `hoy` y `armazon`: 39 de 39, con P-18 ya conectado por F2), salvo:
  - lo de F2 y F3 que ya fallaba en `carril` (aciertos, asignación, Conectores, la ficha) y en `interfaz` (el papel de Riesgo y de Metas).
- `npx tsc -b`: solo falla `e2e/auditor.spec.ts:187`, de F4.
- `npx oxlint src`: limpio.
- `verificar-arbol`: 128 de 128.
- `verificar-contrato`: 199 de 199.
- `verificar-libro`: 527 de 531. Las 4 que fallan son de F2 (las tres de La planta viva, sección C2) y de la referencia (F2 y F3).

## S1

| Id | Estado | Archivos | Prueba |
|---|---|---|---|
| **P-05** · Turno, lo proyectado como cifra grande | Hecho. La cifra grande es lo medido (1.966 bbl/d, 30 px). La proyección va en una línea de 14 px, discontinua, con «proyectado». Lo demás del bloque va en una línea | `pages/Turno.tsx` | e2e «P-05, UI-15, P-09» |
| **G-16** · «Si falla hoy» en dos unidades | Hecho: «≈ N bbl le costaría la falla» | `shared/ui/costoHoy.ts` | e2e «G-16». **F4:** `rutas.ts:133,145` |
| **P-04** · el registro de «Estado» | Hecho con F3, sin registro nuevo: F3 lo resolvió dentro de Configurar (coordinacion.md). El título del registro pasa a «Configurar», y para el gerente, «Metas y accesos» | `app/pantallas.tsx` (`tituloPorRol`, `tituloDe`), `Cabecera.tsx`, `App.tsx` | e2e «UI-08 e I-adm-3» |
| **A1** · el foco no se ve sobre el índigo | Hecho: el anillo es blanco (`.sobre-marca`) en el panel, la banda, el panel del teléfono y la banda de la pregunta. Una línea en X5 §3.1 | `index.css`, `Riel.tsx`, `App.tsx`, `hoy/Operador.tsx`, `X5-sistema-de-diseno.md` | e2e «A1» |
| **H1** · la barra llena con 0 bbl/d | Hecho: el ancho tiene piso en 0 | `shared/ui/BarraMeta.tsx` | e2e «H1 y G-10» |
| **H3** · el mismo equipo con dos marcas | Hecho en lo de F1: `useCondiciones(campos)` da la condición de la franja por equipo, sin endpoint nuevo. Turno, Mi trabajo e Identificar la pintan con su palabra; sin condición, sin marca. **F2 y F3** la usan en Mantenimiento, Riesgo y la placa | `shared/api/condiciones.ts`, `Turno.tsx`, `Trabajo.tsx`, `Causa.tsx` | e2e «H3, H16 y P-trabajo-1» |
| **H2** · repartos que no suman | Hecho en Hoy: «desde que pararon» y «hoy» suman los enteros de `enterosDelPeriodo` (247 + 108 = 355). **No hecho en Identificar:** la cifra de cada parada sale de `usePreguntas` (el libro, de F2), que todavía no trae el entero; la pantalla no redondea por su cuenta | `entities/hoy.ts`, `shared/api/hoy.ts` | verificar-contrato, C3 §9 «H2» |

## S2

| Id | Estado | Archivos | Prueba |
|---|---|---|---|
| **UI-01** · el registro de metas y accesos | Hecho con F3: las partes viven dentro de Configurar (una lista, no pestañas). **No hecho:** una entrada por parte en el menú de la persona. Las partes no tienen dirección propia; el gerente entra por «Metas y accesos» | `pantallas.tsx` | e2e «UI-08 e I-adm-3» |
| **UI-02** · el velo inerte | Hecho: `data-velo` no queda inerte. Va en el panel del teléfono y en `HojaInferior`. **F2:** `HojaTramo` | `shared/ui/foco.ts`, `App.tsx`, `HojaInferior.tsx` | e2e «UI-02» |
| **UI-04** · el título de `Panel` | Hecho: 16 px, Semibold, en tinta | `shared/ui/primitivas.tsx` | e2e «UI-04» |
| **UI-05** · Identificar con otra forma | Hecho: la franja «No arrancar» es el `Bloqueo` de Hoy, y las opciones tienen la forma de las de Hoy (radio 18, 56 px, 64 en el teléfono) | `pages/Causa.tsx`, `arbol/Preguntas.tsx` | e2e «UI-05, P-causa-1» |
| **UI-06** · íconos repetidos, plegado sin palabra | Hecho: Confiabilidad y Filosofía tienen ícono propio. Plegado, cada subpantalla lleva su nombre a 12 px | `pantallas.tsx`, `Riel.tsx` | e2e «UI-06» |
| **UI-20, P-11, I-sup-4** · lo simulado en el bloqueo | Hecho: los planes van en su tarjeta, «Decidir 3 planes de P-201B · simulado», que abre la ficha de P-201B | `entities/hoy.ts`, `hoy/piezas.tsx`, `hoy/Tarjeta.tsx`, `hoy/palabras.ts` | C3 §9 y e2e «UI-20» |
| **P-06** · «Entregar turno» no entrega | Hecho: el motor arma la entrega (`entregaDelTurno`) y se comparte en PDF. Va en su lugar en el escritorio y como hoja en el teléfono. La firma espera su contrato, y se dice | `entities/hoy.ts`, `hoy/Entrega.tsx`, `pages/Hoy.tsx`, `CONTRATO.md` | C3 §9 «P-06» y e2e «P-06» |
| **P-07** · contestar, dos toques y tres verbos | Hecho: la parte es un toque y «Sello mecánico: ¿qué vio?» es la pregunta siguiente: cuenta, y trae «Todavía no sé». Los nombres: «Diga qué se dañó» y «Contestar»; «Responder yo» queda para quien contesta por otro | `entities/hoy.ts`, `hoy/Pregunta.tsx`, `hoy/Operador.tsx`, `Causa.tsx` | `hoy.spec` (operador) y C3 §9 «P-07» |
| **P-08** · «Registrado» antes de escribir | Hecho: mientras se sostiene, el aviso dice «Se registra en 5 s: …», y «Registrado» al escribir. Lo pendiente se guarda en el navegador y sale con `keepalive` al cerrar la página. Al volver, se escribe lo que no salió (un 409 es que ya había llegado). El error no se va solo | `hoy/envio.ts`, `hoy/acciones.ts`, `shared/api/escrituras.ts`, `fuente.ts`, `app/store.ts` | e2e «P-08» |
| **P-09** · cuatro familias para P-201B | Hecho en lo de F1: Hoy, Turno, Mi trabajo, Identificar y «Hoy limita» usan la `FAMILIA` de F2 («bomba de agua») | `entities/hoy.ts`, `Turno.tsx`, `Trabajo.tsx`, `Causa.tsx`, `arbol/HoyLimita.tsx` | e2e «P-05, UI-15, P-09» |
| **P-10** · «Ver los equipos» y Riesgo | Hecho a medias. Hecho: «Ver P-201A y P-201C ›» lleva a Equipos con el tren de agua. **No hecho:** sacar Riesgo de jefe y conf. Equipos todavía no tiene la exposición si fallan hoy, el «qué hacer» de cada equipo ni el colchón («0 si vuelve antes de 10 h»); quitarla perdería función | `entities/hoy.ts`, `shared/api/hoy.ts`, `hoy/palabras.ts` | C3 §9 e e2e «I-jefe-1, I-jefe-2, P-10» |
| **P-15** · la introducción en un modal con párrafo | Hecho: son tres señas de una línea sobre el inicio, sacadas de X4 §6.2 y sin nombrar un equipo del demo. «Siguiente» y «Ya entendí». No es modal y no queda inerte. Va de usted. «Qué es TRIM», a la ⓘ. Desde el menú, abre sobre el inicio | `widgets/Onboarding.tsx`, `MenuPerfil.tsx`, `foco.ts` (`data-flotante`) | e2e «P-15 y A14», `interfaz.spec` |
| **P-16** · la tubería de antes en Identificar | No aplica: Identificar ya no la monta (no hay `choke/Tuberia` en `Causa.tsx` ni en `arbol/*`) | — | — |
| **I-oper-4, I-tec-1** · la tarjeta repite la franja | Hecho: «Sigue parada.» / «Sigue parado.» | `entities/hoy.ts` | C3 §9 e e2e «UI-20, I-oper-4» |
| **I-tec-2** · la orden del técnico en tres oraciones | Hecho: una línea, la primera oración de la orden. El número va en «dónde» | `entities/hoy.ts` | C3 §9 e e2e «I-tec-2» |
| **P-causa-1** · Identificar con todo abierto | Hecho: una parada abierta a la vez; las demás, en una fila con «›». La señal va detrás de «Ver la señal». En el papel salen enteras | `pages/Causa.tsx` | e2e «UI-05, P-causa-1» |
| **P-trabajo-1** · Mi trabajo repite Hoy | Hecho: Hoy del técnico trae «Por vigilar», las órdenes de otros puestos y el aviso de WhatsApp de su orden. Mi trabajo sale de su rol y su dirección abre Hoy. **F4:** `rutas.ts:19,141` (`#/tec/trabajo` ahora abre Hoy) | `entities/hoy.ts`, `shared/api/hoy.ts`, `entities/roles.ts`, `app/url.ts` | C3 §9 «P-trabajo-1», e2e «H3, H16 y P-trabajo-1», `carril.spec` |
| **A2** · el foco cae en `body` | Hecho: el foco va al título de la tarjeta que quedó en su lugar, y a la pregunta nueva (operador y tarjeta) | `pages/Hoy.tsx`, `hoy/Tarjeta.tsx`, `hoy/Operador.tsx`, `hoy/Pregunta.tsx` | e2e «A2 y A3» |
| **A3** · la región `status` y el reloj | Hecho: la región está siempre montada, con «Deshacer» al lado y fuera de ella. El reloj se detiene con el foco o el puntero encima. «Deshecho» también se anuncia. «Hecho hoy» dice dónde se corrige | `hoy/piezas.tsx`, `hoy/envio.ts` | e2e «A2 y A3» |
| **A4** · el foco no vuelve al `<g>` | Hecho: `useModal` guarda también un `SVGElement` | `shared/ui/foco.ts` | e2e «A4» |
| **A5 / UI-18** · blancos de menos de 44 px | Hecho: un área invisible de 44 px (`.toque`) en el ☰, la persona, el campo, la franja, «Demo», el período, los botones, los enlaces, las ⓘ y las subpantallas. **F2:** `Momentos`; **F3:** `Nivel3` y `Planta` | `index.css`, `Riel.tsx`, `App.tsx`, `MenuPerfil.tsx`, `Cabecera.tsx`, `Franja.tsx`, `primitivas.tsx`, `Info.tsx` | e2e «A5» |
| **H6** · la franja se mueve | Hecho: va arriba a la derecha, a la altura de las migas. El período y Exportar van debajo. Medido: 1440, (784, 22); 1280, (624, 22). **F3:** la del nivel 3 | `widgets/Cabecera.tsx` | e2e «UI-22, H14, H6 y H13» |
| **H13** · «0 sin comunicación» del campo | Hecho: «· medidor oficial» en el escritorio, y el alcance en el `aria-label` y el `title` | `widgets/Franja.tsx` | e2e «UI-22, H14, H6 y H13» |
| **H14** · la marca DEMO agranda la cabecera | Hecho: va en la línea de las migas, en frase, a 13 px y sin agrandarla. **F2:** la pérdida a la leyenda y la columna de 1280 | `widgets/Cabecera.tsx` | e2e «UI-22, H14…» |

## S3

| Id | Estado | Archivos | Prueba |
|---|---|---|---|
| **UI-08** · el período y Exportar donde sobran | Hecho: `sinExportar` en Equipos, Riesgo, Conectores, Perfil, Configurar y Filosofía; `ahora` en Configurar y Filosofía. Exportar con su palabra en el teléfono | `pantallas.tsx`, `informe/Exportar.tsx` (una línea) | e2e «UI-08 e I-adm-3» |
| **UI-09** · el aviso negro en la noche | Hecho: `--aviso`, `--aviso-sobre` y `--aviso-accion` (claro sobre oscuro en la noche) | `index.css`, `hoy/piezas.tsx` | e2e «UI-09, UI-10, A8, A19 y A21» |
| **UI-10** · los velos y las casillas | Hecho en lo de F1: el token `--velo` y `accent-color` en la mano. **F2 y F3:** el lema, el avatar y `PanelEquipo` | `index.css`, `App.tsx`, `HojaInferior.tsx` | e2e «UI-09, UI-10…» |
| **UI-12, UI-22** · «DATOS DE DEMOSTRACIÓN» | Hecho: «Datos de demostración», una sola vez por vista, en la línea de las migas; en el teléfono, «Demo». **F4:** `carril.spec.ts:35` (ya ajustado) | `Cabecera.tsx` | e2e «UI-22…» |
| **UI-15** · Turno con cifras de 36 px y letra mono | Hecho | `Turno.tsx`, `Trabajo.tsx`, `arbol/Calidad.tsx`, `arbol/Tarjeta.tsx` | e2e «P-05, UI-15…» |
| **UI-21** · «Pregunta 1 de 4» fuera de la banda | Hecho: va en la banda del ☰, con un portal, en el lugar del campo y la persona, como la imagen 5 | `App.tsx`, `shared/ui/ranura.ts`, `hoy/Operador.tsx`, `index.css` | `hoy.spec` (operador) |
| **UI-23, T-5** · «Hoy › Hoy» | Hecho: la subpantalla que repite el nombre de su puerta no se lista. Desde adentro, la puerta abre la primera | `Riel.tsx` | `armazon.spec` |
| **P-17** · un rol de v2 en la dirección | Hecho: «El rol «Planeadora de mantenimiento» todavía no está en esta versión: le mostramos…» | `app/url.ts`, `app/store.ts` | e2e «P-17» |
| **P-18** · el momento en la dirección | Hecho: `momento` y `setMomento` en el estado; `url.ts` lo lee y lo escribe; atrás y adelante lo cambian; `PlantaViva.tsx` (F2) lo lee | `app/url.ts`, `app/store.ts` | e2e «P-18» |
| **P-21** · el Resumen sin uso | Hecho en lo de F1: sale del registro y de `hoy/palabras.ts`; su dirección sigue abriendo La planta viva. **F2:** borrar el archivo cuando F4 deje de leerlo | `pantallas.tsx`, `hoy/palabras.ts` | `verificar-libro` §11 (las direcciones) |
| **T-1** · la cabecera del teléfono | Hecho: sin migas con un campo; «‹ Todos mis campos» con varios; Hoy sin la fecha (imagen 3b); «Demo» al lado del título | `Cabecera.tsx` | e2e «T-1» |
| **T-10, T-11** · números de paso y «modelo choke» | Hecho en Identificar: sin «1 ·» ni «2 ·», sin el número de la cadena ni «Paso 2»; la ⓘ va al lado del título | `Causa.tsx`, `arbol/Cadena.tsx`, `arbol/Calidad.tsx` | e2e «UI-05, P-causa-1, T-10, T-11» |
| **G-10** · «máx.» | Hecho: `BarraMeta` dice «máximo», una vez | `BarraMeta.tsx` | e2e «H1 y G-10» |
| **I-sup-1, I-sup-2, I-sup-3, I-sup-5** | Hecho: el motor da lo corto (`remateCorto`, `porqueCorto`) y la pantalla lo usa en el teléfono. La salvedad del bloqueo va a la ⓘ; al operador no | `entities/hoy.ts`, `hoy/piezas.tsx`, `hoy/Tarjeta.tsx` | C3 §9 e e2e «I-sup-…» |
| **I-jefe-1, I-jefe-2** | Hecho: la espera, a la ⓘ de la unidad; «Entre las 3: …» | `entities/hoy.ts`, `hoy/piezas.tsx` | C3 §9 e e2e «I-jefe-…» |
| **I-adm-3** · tres nombres | Hecho: «Configurar», y «Metas y accesos» para el gerente | `pantallas.tsx` | e2e «UI-08 e I-adm-3» |
| **P-turno-2, P-turno-3** | Hecho: «Cierre de hoy · faltan 4 de 4 · antes de las 07:00»; la frase de Hoy y la cadena en la ⓘ | `arbol/CierreDeHoy.tsx` | e2e «P-turno-2 y P-turno-3» |
| **H19** · marcas de 9 a 11 px | Hecho: mínimo de 12 px, y 14 en el teléfono, en `MarcaCondicion` | `shared/ui/Prioridad.tsx` | e2e «H19 y A16» |
| **H16, H17** · Turno | Hecho: la marca del equipo con su palabra; sin prioridad propia, sin marca | `Turno.tsx` | e2e «H3, H16…» |
| **H27** · la tubería chica estirada | Hecho: la de La planta viva, con su proporción | `hoy/Lateral.tsx` | e2e «H27» |
| **H31** · X5 §3.1 | Hecho: protanopía 6,24 y por qué no se cruzan | `X5-sistema-de-diseno.md` | — (documento) |
| **A8** · el papel en oscuro | Hecho: `color-scheme: light` al imprimir, también en el CSS | `app/store.ts`, `index.css` | e2e «…A8…» |
| **A10** · `aria-controls` siempre | Hecho | `foco.ts`, `Riel.tsx` | e2e «A10 y A11» |
| **A11** · «DEMO» sin nombre | Hecho: `aria-label` y `useDesplegable` | `Cabecera.tsx` | e2e «A10 y A11» |
| **A12, A13** · el título y saltar | Hecho | `App.tsx` | e2e «A12 y A13» |
| **A14** · el foco al cerrar la introducción | Hecho: va al título de la vista | `Onboarding.tsx`, `Cabecera.tsx` | e2e «P-15 y A14» |
| **A15** · niveles de títulos | Hecho en lo de F1: `h2` en las tarjetas de Hoy y al lado; `h3` en Identificar y Mi trabajo (eran `h5`) | `hoy/Tarjeta.tsx`, `hoy/Lateral.tsx`, `Causa.tsx`, `Trabajo.tsx` | `hoy.spec` (títulos) |
| **A16** · «Prioridad 1 · alarma» | Hecho: con coma. **F4:** `experiencia-f2c.spec.ts:227` | `shared/lib/prioridad.ts` | e2e «H19 y A16» |
| **A17** · `Tip` sin rol | Hecho: `role="button"` con `aria-expanded` | `shared/ui/Tip.tsx` | e2e «A17» |
| **A19** · `prefers-contrast` y `forced-colors` | Hecho, sin tocar los colores de estado | `index.css` | e2e «…A19…» |
| **A20** · CLS de 0,0545 | Hecho: la cabecera espera con su alto; medido 0,0009 | `App.tsx` | e2e «A20» |
| **A21** · el papel parte un título de lo suyo | Hecho en lo de F1 (`break-after` y `data-sin-partir`). **F2:** la barra y su leyenda en un bloque | `index.css` | e2e «…A21» |

## Lo que queda

- **Para F2:**
  - UI-02: `data-velo` en `HojaTramo`;
  - H3: `useCondiciones` en Mantenimiento y Riesgo;
  - H2: el entero de cada parada en `usePreguntas`, para Identificar;
  - P-21: borrar los archivos.
- **Para F3:**
  - H6: la franja del nivel 3 en (784, 22) a 1440;
  - H3: `useCondiciones` en la placa;
  - P-10: la exposición, el «qué hacer» y el colchón en Equipos, para poder fundir Riesgo de jefe y conf.
- **Para F4:**
  - `rutas.ts:19,133,141,145`;
  - `experiencia-f2c.spec.ts:227`;
  - el error de tipos de `auditor.spec.ts:187`.
- **No hecho:** una entrada por parte de Configurar en el menú de la persona (UI-01). Las partes no tienen dirección propia; se hará cuando la tengan.
