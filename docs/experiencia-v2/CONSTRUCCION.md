# Experiencia v2 · Construcción

**25-oct-2026 · Coordinador.** El dueño dio la orden: «hazlo todo… que quede como la opción B».

Lo leen todos los agentes de construcción antes de tocar código.

## Lo que manda (en este orden)

1. **Las palabras del dueño:**
   - el diseño es el de B, sin mezcla de estilos: todo se ve como B;
   - la tubería de C va dentro de la tarjeta principal de B;
   - los gráficos y cifras de A van redibujados en el estilo de B;
   - la navegación es un **panel lateral izquierdo azul**; en el teléfono, ese mismo panel abre desde la izquierda con ☰;
   - **ninguna barra de pestañas horizontal**, ni arriba ni abajo;
   - el azul de marca se queda;
   - la vista del gerente se llama «La planta viva».
2. **Las imágenes aprobadas para construir:** `docs/experiencia-v2/imagenes/*.png`. Su HTML, CSS y datos están en `imagenes/fuente/`; cada pieza se puede pasar a React tal cual.
3. **`X5-sistema-de-diseno.md`:** tokens (§3), navegación (§4), componentes (§5) e ISA-101 (§6).
4. **`X4-arquitectura-roles.md`:** las puertas por rol (§3.2), Hoy (§3.3), el inicio de cada rol (§3.4), el mapa de cada panel (§3.7), La planta viva (§4) y lo técnico (§5).
5. **`X2-norma-hmi.md`:** la paleta y las 44 comprobaciones. **`X3-librerias.md`:** SVG propio, sin librerías de gráficos ni de diagramas.

## Reglas de siempre (no negociables)

- **El motor calcula y la pantalla pinta.** Toda cifra, frase u orden sale de `src/entities` por el contrato (`src/shared/api`). oxlint prohíbe que una pantalla importe el motor.
- **Nada inventado.** Las cifras son las del demo. Cuando el motor no tenga un dato, la pantalla dice «sin dato»; no se rellena.
- **Diferido no es pérdida.** El diferido «se deja de producir», «no pasa» o «se trabó». Pérdida es lo que salió y no se vendió. Nunca se suman.
- **D1–D7 de `docs/plan-circular-24/CORRECCIONES-QA.md` siguen vigentes.** Lo de las personas se guarda por paso, solo por inserción. Nada de texto libre a la ANH. Una sola cifra del norte. Menos de 300 ms por cálculo.
- **Ninguna función se pierde.** Cada panel de hoy queda en su lugar nuevo (X4 §3.7). Las direcciones viejas siguen abriendo (`url.ts`).
- **Pruebas:**
  - cada cambio de motor lleva su prueba, que falla sin el cambio;
  - se prueba el resultado, no el mecanismo;
  - lo nuevo de pantalla lleva su e2e en `e2e/`, aunque lo corra el coordinador.
- **Al terminar:** `npx tsc -b` (nunca `--noEmit`), `npx oxlint src` y `npm test`. Los errores de archivos que son de otro agente no se tocan: se anotan.
- **NO correr `npx playwright test`** (las e2e). Las corre el coordinador cuando todos terminan: si alguien edita mientras corren, Tailwind recarga y salen pantallas vacías.
  - Sí se pueden tomar capturas propias con Playwright contra un servidor de Vite en **otro puerto** (5180–5189), que se apaga por su PID.
- **NUNCA** `pkill`, `killall` ni matar procesos por nombre.
  - No toques los puertos **4173** (el demo del dueño), **5173** ni **4199**.
  - No `npm i`. No commits (los hace el coordinador).
- **Español de Colombia, de usted.** Palabras de campo, sin códigos ni la palabra «choke» para el gerente.

## Dueños de archivos (para no pisarse)

| Agente | Tanda | Es dueño de | Puede leer, no editar |
|---|---|---|---|
| **C1 · Identidad y armazón** | 1 | `src/index.css`, `src/App.tsx`, `src/widgets/Riel.tsx`, `Cabecera.tsx`, `MenuPerfil.tsx`, `Subpantallas.tsx`, `Onboarding.tsx`, `src/app/pantallas.tsx`, `grupos.ts`, `url.ts`, `src/entities/roles.ts`, `src/shared/ui/*`, `src/shared/brand/*`, el motor y la API de la franja de condiciones (archivos nuevos), y el **cambio de tamaños de letra** en `src/pages/*` y `src/widgets/*` existentes | `pages/PlantaViva.tsx`, `pages/Hoy.tsx` y sus widgets (son de C2 y C3) |
| **C2 · La planta viva** | 1 (en paralelo) | `src/pages/PlantaViva.tsx`, `src/widgets/plantaviva/*` (nuevo), `src/entities/planta-viva.ts` (nuevo), `src/shared/api/plantaViva.ts` (nuevo), su sección propia en `contrato.ts`, `CONTRATO.md` y `scripts/verificar-*.mjs`, `e2e/planta-viva.spec.ts` | los widgets existentes (`widgets/choke/*`, `resumen/*`, `ciclo/*`): se reutilizan sin editarlos; si hace falta cambiar uno, se pide |
| **C3 · Hoy** | 1 (en paralelo) | `src/pages/Hoy.tsx`, `src/widgets/hoy/*` (nuevo), `src/entities/hoy.ts` (nuevo), `src/shared/api/hoy.ts` (nuevo), su sección en `contrato.ts`, `CONTRATO.md`, `scripts/verificar-*.mjs` y `escrituras.ts` (solo lo de «Deshacer»), `e2e/hoy.spec.ts` | `widgets/arbol/*` (Preguntas), `widgets/whatsapp/*` |
| **C4 · Equipos y nivel técnico** | 2 | `src/pages/Equipos.tsx` (nuevo), `src/widgets/equipos/*` (nuevo), el nivel 3 de la ficha técnica (`PanelEquipo`, `widgets/bombas/*`, `widgets/equipo/*`), `Analogico`/`Sparkline` si hace falta | — |
| **C5 · Resultados y limpieza** | 2 | `src/pages/Resultados.tsx` (nuevo), las fusiones de X4 §3.6, «un nombre, una cifra» (X4 §1.3.3: 1.665 contra 1.966) y la regla del auditor para texto SVG recortado (X3) | — |
| **QA** | 3 | revisión adversarial: imágenes contra la app, X2 (44 comprobaciones), X4 (cada función en su lugar), números contra el demo | — |

**Archivos compartidos** (`contrato.ts`, `CONTRATO.md`, `scripts/verificar-contrato.mjs`, `verificar-libro.mjs`):
- cada agente agrega **su propia sección** al final, con un comentario que empieza por su nombre (`// C2 · La planta viva`);
- se vuelve a leer el archivo justo antes de cada edición;
- no se reordena ni se reformatea lo de otros.

**El registro de pantallas** (`pantallas.tsx`, `roles.ts`, `grupos.ts`) es de C1. Registra `plantaViva` (`@/pages/PlantaViva`, export `PlantaViva`) y `hoy` (`@/pages/Hoy`, export `Hoy`). C2 y C3 crean esos archivos **lo primero**, con un componente mínimo que ya renderice, para que el registro compile desde el inicio.

## Las puertas (X4 §3.2 con lo que decidió el dueño)

El panel izquierdo tiene las puertas en orden fijo: **Hoy · La planta viva · Equipos · Resultados**. Cada rol ve las suyas:

| Rol | Puertas |
|---|---|
| ger | La planta viva, Equipos, Resultados |
| sup, oper, tec | Hoy, La planta viva, Equipos |
| prod, jefe, conf | las cuatro |
| plan | Hoy, Equipos, Resultados |
| reg | Reporte, La planta viva, Resultados |
| adm | Configurar, La planta viva |
| cont | Paradas y evidencia |

Cada rol abre en su respuesta (X4 §3.4): ger y prod en La planta viva; sup, oper, tec, jefe y plan en Hoy; conf en Equipos; reg en Reporte; adm en Configurar.

**Las pantallas de hoy quedan dentro de su puerta** mientras las tandas 2 y 3 las fusionan:
- Hoy: hoy (nueva), causa, turno, trabajo.
- La planta viva: plantaViva (nueva), planta, agua, riesgo y resumen (la del gerente, mientras dure).
- Equipos: bombas, esp, pozos, equipo.
- Resultados: diferidos, producción, confiabilidad, mantenimiento.
- Reporte: regulatorio.
- Configurar: configuración, filosofía, conectores.
- Paradas y evidencia: evidencia.

**Las subpantallas no van en pestañas horizontales:** se listan dentro del panel azul, debajo de su puerta, cuando la puerta está abierta. En el teléfono, en el mismo panel.

## Cierre de cada tanda (lo hace el coordinador)

`tsc -b` · `oxlint` · `npm test` · las e2e de todos los proyectos (`caffeinate -dims`) · el auditor de desbordes (100 rutas × 5 anchos) · capturas contra las imágenes · commit y push · `npm run paquete` y reinicio del demo de 4173 por su PID.

## C2 · hecho

**25-oct-2026 · C2 · La planta viva.** La pantalla, el motor, el contrato, sus pruebas y su e2e. `tsc -b`, `oxlint src` y `npm test` en verde (467 + 128 + 172 comprobaciones y los 257 casos de referencia); `verificar-contrato --http`, 15 de 15. Capturas contra las imágenes 1, 2 y 6 en 1440 × 900 y 390 × 844, en claro y en oscuro, de La Ceiba (gerente y producción) y de «Todos mis campos»; el detector del auditor no encuentra nada que se salga ni se pise en 1440, 1280, 1024, 768 y 390 px, en los tres momentos y con la hoja abierta.

**Archivos (nuevos, todos de C2):**
- `src/entities/planta-viva.ts`: el motor. `plantaViva(q, ctx, versiones, { guardadas })` junta `tuberiaCampo`, `riesgoAhora`, `estadoCampo`, `criticidadDelCampo` (`desembotellar`), `tuberiaAgua`, `libro`, `serieMensual`, `lineaBasePorTramo` (desde la puesta en marcha), `arbolDelChoke` (orden de gestión) y `cicloValor`. Las frases nuevas de «ahora» y de «lo que viene» (la del período es `fraseGerente`). Guardado por contexto, historial, guardadas, campos y período (D7: 31 ms los cinco campos; otro momento, menos de 1 ms).
- `src/shared/api/plantaViva.ts` (`usePlantaViva`, `pedirPlantaViva`), `PLANTA_VIVA` al final de `contrato.ts` y su sección al final de `CONTRATO.md`.
- `src/pages/PlantaViva.tsx` y `src/widgets/plantaviva/`: `Heroe` (la cifra de B y los dos botones), `Momentos` (la píldora, un grupo de radios), `Tuberia` (acostada, de pie y en chico), `Filas` («Este mes» y la producción contra la meta), `Lateral` (lo que se puede mover, por equipo, mes a mes y ¿está bajando?), `Campos` (todos mis campos), `HojaTramo` (panel a la derecha / hoja que sube), `acciones` (abrir la ficha, compartir), `piezas` y `cifras`.
- Pruebas: la sección «C2» al final de `scripts/verificar-libro.mjs` (cuadres 1.665 + 301 = 1.966 y 118 + 573 + 355 = 1.046, un nombre una cifra, las frases, cada cifra contra su pantalla de hoy, los estados, D7) y de `scripts/verificar-contrato.mjs` (la respuesta del demo, 54 casos de ida y vuelta, y las cifras contra las vistas de donde salen). `e2e/planta-viva.spec.ts` (sin correr).

**Para el coordinador (no son archivos de C2):**
- `.oxlintrc.json`: falta la regla de `@/entities/planta-viva` (las pantallas no la importan: todo llega por `@/shared/api/plantaViva`) y `pedirPlantaViva` en la lista de `pedir*` prohibidos.
- `widgets/informe/Exportar.tsx` no exporta `useExportar`: «Compartir el informe» repite ese camino (`useCompartir` en `widgets/plantaviva/acciones.ts`, mismo `emitirInforme` y el mismo PDF con folio). Si se exporta el gancho, se cambia por él.
- `referencia/`: no se regeneró (es compartida). `node scripts/referencia.mjs generar` agregaría los casos de `/vistas/planta-viva` para un backend.
- La cabecera del contenido (migas, título y franja) es de C1 y ya se ve como la imagen; «DATOS DE DEMOSTRACIÓN» la hace 33 px más alta que la imagen.
- No se editó ningún widget de `choke/`, `resumen/` ni `ciclo/`: todo se redibujó en `widgets/plantaviva/` con el estilo de B.

**Pendiente (lo que el motor todavía no da o se dejó afuera a propósito):**
- La gota de la pérdida: no hay registro de pérdidas (P1 §1.9); se dice «sin eventos registrados».
- La rama del agua de todos los campos: `TREN_AGUA` trae La Ceiba y Morichal; Guacamayo sale con su tanque y El Palmar y La Zarza, en gris discontinuo («sin dato»).
- «Sin comunicación» con un medidor de caudal («al menos» en la cifra): la vista trae `sinComunicacion` solo del punto oficial.
- «Pedir a {rol}» como escritura para el gerente: hoy «Pedir la causa» lleva a Identificar a quien la tiene y al gerente le abre la ficha del pozo.
- La capacidad sin firmar con su ⓘ en «limita» y los tres carriles de la planta (crudo, agua, gas) en la tubería del gerente.
- La tabla de los tres momentos de X4 §4.6 b no va: la imagen aprobada pone las filas de A en su lugar. La línea simulada de cada momento va en la fila de «Todos mis campos» y, en la tarjeta de la derecha, para el lector de pantalla.

## C3 · hecho

**25-oct-2026 · C3 · Hoy.** El motor, el contrato, «Deshacer», la pantalla (escritorio, supervisor y operador en el teléfono) y su e2e. `tsc -b`, `oxlint src` (sin avisos en lo de C3) y `npm test` en verde (467 + 128 + 172 comprobaciones; la sección C3 de `verificar-contrato` son 25, y la http, una más). Capturas contra 3a, 3b y 5 a 1440 y 390 px (sup, oper, tec, jefe).

**Archivos (nuevos, todos de C3):**
- `src/entities/hoy.ts`: el motor. `hoy(entrada)` cruza lo que ya calculan el libro (preguntas y sus opciones), el árbol de la ANH (mes en curso, con lo guardado), el riesgo, la franja (C1), WhatsApp, SAP, el ciclo, la tubería y el agua, «si falla hoy», los relojes y el vigía, la asignación oficial, las metas, los análisis y el programa. Cada tarea lleva la capacidad de `roles.ts` que la autoriza. `ordenar` (hora → barriles ahora → barriles si para → lo demás por antigüedad → avisos). La cifra y la frase de cada rol (X4 §3.4), la insignia, «Hecho hoy», «Su campo, ahora», el WhatsApp del turno y el diferido del turno.
- `src/shared/api/hoy.ts`: `pedirHoy`, `useHoy`, `useInsigniaDeHoy` (ya la usa el panel de C1). `HOY`, `CuerpoDeshacerAnh` y `R_DESHACER` al final de `contrato.ts` (`// C3 · Hoy`) y la sección «C3 · Hoy» al final de `CONTRATO.md` (qué junta y con qué capacidad, el orden, las formas y «Deshacer» con sus rechazos).
- `src/shared/api/escrituras.ts`: solo `deshacerAnh` al final (y sus dos importaciones arriba): `POST /api/anh/paradas/deshacer { ids, n }` escribe, por inserción, un paso `retirado` con el valor, quién, la hora y «deshecho por quien contestó», con un consecutivo mayor, en la misma clave; rige y la fila vuelve a lo que propone TRIM. La confirmación y su lote quedan. 400 · 403 (`ajeno`, `sin-capacidad`) · 404 · 409 (`ya-cambio`).
- `src/pages/Hoy.tsx` y `src/widgets/hoy/`: `piezas.tsx` (la cifra con su frase, la franja ⊘ en tinta con borde de 2 px, «Hecho hoy (n)» plegado, el aviso oscuro con «Deshacer»), `Tarjeta.tsx` (verbo + qué; dónde con la marca del equipo y su palabra; por qué; la acción de un toque y «Ver…»; contestar en la misma tarjeta), `Pregunta.tsx` (opciones de 64 px, siempre «Todavía no sé»), `Operador.tsx` (una pregunta por pantalla con la banda índigo, «Pregunta 1 de 4», la tubería chica con el tramo marcado; un toque registra y pasa a la siguiente, vibración de 10 ms), `Lateral.tsx` («Su campo, ahora» con la tubería en chico dibujada aquí, «El turno en WhatsApp», «Diferido de su turno»), `acciones.ts` y `envio.ts` (contestar, confirmar y «Deshacer»), `palabras.ts`, `comun.tsx`.
- Pruebas: la sección «C3» al final de `probarDemo` en `scripts/verificar-contrato.mjs` (las cifras y frases de sup, oper, tec y jefe; el orden y la anatomía de las tarjetas de 3a; la franja; la insignia sin los avisos; las preguntas de la imagen 5; **cada rol, en cada campo y en todos, solo ve lo que su capacidad le deja** (54 vistas); el orden con tareas armadas a mano; D7, menos de 300 ms con cada rol; «Deshacer»: los rechazos, el `retirado` que rige, el lote que queda, 409 la segunda vez, reconfirmar; ida y vuelta por JSON), más `HOY` en las respuestas y los casos de la sección 2, `POST /anh/paradas/deshacer` en la lista de rutas, y una comprobación http al final de `probarHttp`. `e2e/hoy.spec.ts` (no se corrió): el orden de las tarjetas, «Confirmar las 2» → «Hecho hoy (1)» → «Deshacer», el operador a 390 px (1 de 4 → 2 de 4, opciones de 64 px, sin «Siguiente», «Deshacer»), la insignia y el vacío.

**Decisiones (para revisar):**
- **«Deshacer» de una respuesta** no es una escritura: la pantalla la sostiene los 5 s del aviso y la escribe al vencer, al registrar otra o al salir de la página; «Deshacer» la suelta antes. El libro guarda una respuesta por parada (la primera gana) y la conversación del árbol solo se alarga: deshacer una ya escrita obligaría a borrar o dejaría la pregunta cerrada. Para que sea una escritura hace falta que el motor de la conversación (`seguirConversacion`, `entities/anh-clasificacion.ts`) reabra una pregunta con una respuesta nueva que deshaga otra, y una historia de respuestas retiradas en el libro (`ctx.respuestas`). La **confirmación** sí se escribe en el acto y se deshace con `POST /api/anh/paradas/deshacer`.
- **La parte de una bomba son dos toques** (la parte y «¿qué vio?»): el libro exige la parte con lo que se vio (ISO 14224; U1 §2.2, caso B). La imagen 5 la registra con uno. «Otra cosa» pide escribir. No hay foto: ningún endpoint la recibe.
- **La franja** junta lo que sigue parado sin identificar: «No arrancar P-201B ni LC-21 hasta identificar qué se dañó» (la imagen 3a dice solo P-201B; LC-21 también está parado sin causa y Turno ya le pone «no arrancar»).
- **Al supervisor**, «Conseguir la causa» junta las paradas de pozo sin causa (las que dejan el reporte sin causa: LC-21 y LC-08, como la imagen); la parte de P-201B es del operador y del técnico, y para él está en la franja. Al jefe y a confiabilidad les llegan las tres.
- **Las preguntas del árbol**: al operador y al técnico, las del mes en curso (su «Por contestar» de hoy: por eso «Tiene 4 preguntas» cuenta LC-05); a quien revisa, las de hoy (el reporte de mañana). Por eso el técnico tiene 5 cosas (X4 decía 4, contadas en Mi trabajo, sin LC-05).
- **Los planes simulados** que tocan el equipo de otra tarjeta (o de la franja) van como una línea en ella («Plan simulado: volver antes de 39 h (2.072 bbl), y 2 planes más ›»); los demás, en una tarjeta «Decidir N planes». Los que no mueven crudo (identificar el daño) no se repiten.
- **«El turno en WhatsApp»** son las últimas 12 h, como Turno: 8 mensajes, P-201B y K-101 (la imagen pone también LC-21, cuyos mensajes son de antes del turno).

**Para el coordinador y para C1 (no son archivos de C3):**
- `.oxlintrc.json`: falta la regla de `@/entities/hoy` (las pantallas solo importan sus tipos) y `pedirHoy` en la lista de `pedir*` prohibidos.
- **El operador en el teléfono:** la imagen 5 pone la pregunta en la banda del ☰. Hoy la cabecera de la vista (migas, «Hoy», la franja y «DEMO») queda entre la banda de C1 y la banda de la pregunta (`Operador.tsx`, a lo ancho y en índigo). Propuesta para C1: que la cabecera no se pinte en el teléfono cuando la vista es la pregunta del operador (por ejemplo, un marcador en `PANTALLAS.hoy` o en la vista), y entonces `Operador.tsx` pone la franja debajo de la banda, como la imagen.
- El store no tiene `deshacerAnh`: `widgets/hoy/acciones.ts` llama la escritura directo con el rol que se ve. Si se prefiere por el store, es una línea.
- `referencia/`: no se regeneró (es compartida); `node scripts/referencia.mjs generar` agregaría casos de `/vistas/hoy` para un backend.
- El registro de WhatsApp del demo (`shared/api/mensajes.ts`) tarda unos 160 ms la primera vez que se arma (toda la historia de los cinco campos). Hoy lo pide solo para sup, oper, jefe y conf; con el registro ya armado, Hoy tarda menos de 20 ms por rol (el jefe en todos los campos, el más lento, por los relojes).

**Pendiente:**
- La «Entrega de turno» como resumen firmado que se comparte por WhatsApp o en PDF (X4 §5.5): hoy «Entregar turno» abre la pantalla Turno que ya existe.
- Lo de adm en «Estado» (firmar la versión, tags sin equipo) y el aviso «Cambió lo que limita» de producción: no están en Hoy (adm no tiene la puerta; el aviso necesita un cambio de lo que limita que el motor dé por día).
- «Ver el chat» lleva a Identificar, donde está el hilo de cada parada; no abre el chat de esa parada directo.
- La tubería chica de «Su campo, ahora» está dibujada en `widgets/hoy/Lateral.tsx` (`MiniTuberia`): se puede cambiar por la de C2 (`widgets/plantaviva`, «en chico») cuando se junten.

## C1 · hecho

**25-oct-2026 · C1 · Identidad y armazón.** Los tokens de B en los dos temas, la paleta de estado de X2, la letra, las primitivas, el panel lateral azul (escritorio y teléfono), las puertas, la cabecera con la franja de condiciones (y su motor) y la introducción. `tsc -b`, `oxlint src` (sin avisos en lo de C1) y `npm test` en verde (467 + 128 + 172 comprobaciones y los 257 casos de referencia). Capturas contra las imágenes 1, 2, 3a, 4, 5 y 6 de las seis rutas pedidas, a 1440 × 900 y 390 × 844, en claro y en oscuro, con el panel plegado, abierto en el teléfono y la introducción. Sin desbordes ni texto HTML de menos de 12 px a 320, 390 y 1440 px en 60 rutas de todos los roles; nada recortado en el panel ni en la cabecera de 320 a 1440.

**Archivos:**
- `src/index.css`: los tokens de X5 §3 con los nombres de siempre (`--suelo`, `--panel`, `--tinta`…) y los nuevos (`--marca`, `--marca-tenue`, `--marca-capa`, `--marca-suave`, `--primario`, `--primario-sobre`, `--foco`, `--interlock`, `--sincom`, `--dato1`, `--dato3`, `--rayado`, `--tubo-vacio`, `--roca`, `--pista`, `--banda`, `--pared`, `--agua`, `--flujo`, `--eq-marcha`, `--eq-parado`, `--sombra-flota`). Papel y noche (nunca negro). **Estado según X2:** `--p1` naranja (alarma, rombo «1»), `--p2`/`--p3` amarillo con trazo (atención y aviso), `--interlock` rojo solo para el candado, `--sincom` morado (`--invalido` es su alias). `--p4` (el azul) se eliminó: nadie lo usaba como estado; `--acento` queda como alias de la mano (`--foco` y `--marca-suave`). `--sombra` es `none` (las tarjetas se separan por el tono). Cuerpo a 16 px con cifras tabulares; `small`, `sub` y `sup` no bajan de 12 px. Las tarjetas hechas a mano (`rounded border bg-[var(--panel)]`) toman el radio 20 sin borde, y una dentro de otra va en `--panel2` (regla de CSS, hasta que las tandas 2 y 3 las redibujen). La regla del operador en el teléfono (abajo).
- `src/shared/ui/`: `Prioridad.tsx` (`MarcaCondicion`: candado, rombo, triángulo y cuadrado con trazo, círculo punteado con y sin raya, falta, sin instrumento, reloj, anticipa, normal y «No arrancar»; `MarcaPrioridad`, `DatoInvalido` y `MarcaEstado` pasan por ella), `primitivas.tsx` (`Tarjeta`, `Panel`, `Metrica`, `Chip`, `Calidad`, `Boton` en píldora —principal índigo y secundario con aro—, `Enlace` con «›», `Fila` de 56 px con «›», `Hueco`, `Cita`, `SubirCsv`), `BarraMeta` (la barra de Few de X5 §5.4), `Analogico` (el valor y el puntero en tinta: el amarillo no se leía), `Sparkline` (trazo en el amarillo), `Tip`, `Lectura`, `HojaInferior` y `LimiteDeError` con el aspecto de B.
- `src/shared/brand/Logo.tsx`: `WordmarkBlanco` e `IconoPlanta` (el tubo que se angosta).
- `src/App.tsx`, `src/widgets/Riel.tsx`, `MenuPerfil.tsx`, `Subpantallas.tsx`, `Cabecera.tsx`, `Franja.tsx` (nuevo) y `Onboarding.tsx`: el panel índigo de 240 / 88 px (plegar con el botón del pie o «[», recordado por persona en `trim.riel.<rol>`, plegado por debajo de 1280 px), el logo blanco, la píldora blanca del campo con su peor marca, las puertas con la insignia de Hoy (`useInsigniaDeHoy` de C3), las subpantallas de la puerta abierta debajo de ella (plegado, como íconos), «¿Cómo se lee?» y la persona en el pie. En el teléfono, la banda índigo (☰ con la insignia, logo, campo, iniciales) y el mismo panel desde la izquierda al 84 %, con el fondo al 40 %; se cierra con la X, tocando afuera, deslizando a la izquierda, con Escape o al escoger. `Subpantallas.tsx` ya no pinta pestañas: solo dice lo que el campo no tiene. Lo que un rol tiene fuera de sus puertas va en el menú de la persona («Metas y accesos» del gerente; la configuración en solo lectura de producción y confiabilidad).
- La cabecera: migas («Todos mis campos › La Ceiba › Equipos»), el título con «hoy, 2 de oct · datos de las 14:00», «DATOS DE DEMOSTRACIÓN» junto a las migas, y a la derecha el período y Exportar (solo donde la pantalla los usa: `ahora` y `sinExportar` en `PANTALLAS`) y la franja. Cada cuenta de la franja abre su lista y cada fila abre el equipo.
- **El motor de la franja:** `src/entities/condiciones.ts` (`franjaDe`, `franja`): una condición por equipo, la más grave de su estado de hoy y de su fila de Riesgo; «sin comunicación» es el computador de flujo oficial sin el dato del último día; el interlock queda en cero hasta que el motor lo registre. `src/shared/api/condiciones.ts` (`useFranja`, `pedirFranja`): sale de `/vistas/equipos-hoy` y `/vistas/riesgo`, sin endpoint nuevo. `.oxlintrc.json`: sus dos reglas. Prueba: sección «C1» al final de `scripts/verificar-libro.mjs` (La Ceiba 2 · 2 · 1 · 0 con sus equipos; todos los campos 4 · 8 · 2 · 0; una marca por equipo, MPP-301 en atención; cuenta = lista y en orden; el medidor sin dato sale morado y la termografía no; 3 ms).
- `src/app/pantallas.tsx` (`plantaViva` con ruta `planta-viva` y `hoy`; las puertas `GRUPOS` y `PUERTAS_DEL_ROL`; `fueraDePuertas`), `grupos.ts`, `url.ts` (`pantallaDeRuta` y `rutaDe`: la dirección lleva la ruta y acepta el id; las de antes siguen abriendo) y `src/entities/roles.ts` (cada rol suma La planta viva y Hoy según sus puertas, sin perder ninguna pantalla, y abre en su respuesta: ger y prod en La planta viva; sup, oper, tec, jefe y plan en Hoy; conf en Equipos; reg en Reporte; adm en Configurar). `e2e/auditoria/rutas.ts`: las rutas nuevas.
- `src/widgets/informe/useExportar.ts` (nuevo): **`useExportar` ya se exporta** (para «Compartir el informe» de C2); `Exportar.tsx` lo importa de ahí y su botón es una píldora.
- La letra en `src/pages`, `src/widgets` y `src/shared/ui` (sin tocar los de C2 y C3): 1.150 tamaños en 96 archivos, con un criterio parejo (9,5 y 10 → 12; 10,5 y 11 → 13; 11,5 y 12 → 14; 12,5 y 13 → 15; 13,5 → 16; `text-xs` → 14). En SVG, los rótulos de las gráficas de A (`MesAMes`, `Factor` dibujada a su ancho, `Diaria`, `Mensual`, `Serie`, `Proyeccion`, `ResumenDirectivo`, la de fallas de `Confiabilidad`), revisados en captura. Las rejillas de 250 px o más usan `minmax(min(…, 100%), 1fr)` (a 320 px se salían 36 px). Los 8 selectores segmentados van en píldora con lo escogido en índigo. `Pozos.tsx` y `Planta.tsx` ya no pintan texto en `--p1`.
- Pruebas que cambiaron con la decisión (en `verificar-libro.mjs`): §13 mide la paleta de X2 (y que no quede `--p4`); el operador sin rol en la dirección cae en su inicio (Hoy), y el administrador ve todos sus campos solo por La planta viva. `e2e/armazon.spec.ts` (no se corrió): puertas por rol y su inicio, subpantallas en el panel y ninguna pestaña, «[» y el recuerdo, la franja y su lista, y a 390 px la banda y el panel al 84 %.

**Para C3 (Operador en el teléfono):** la cabecera ya no se interpone: con `[data-operador="pregunta"]` en la vista y a menos de 640 px, `index.css` la esconde y quita el margen de arriba, así la banda de la pregunta queda pegada a la del ☰ (se conserva el `-mx-4` de su `header`). Falta que `Operador.tsx` ponga **`<Franja />`** (`import { Franja } from '@/widgets/Franja'`) debajo de su banda, como la imagen 5, y quitar el comentario «la franja va en la cabecera».

**Para el coordinador:**
- e2e que cambian por diseño y hay que ajustar: `carril.spec.ts:180-184` y `choke-produccion.spec.ts:117` (el menú ahora son puertas y subpantallas; solo lo activo lleva `aria-current`), `perfil-plan.spec.ts:18` (`[data-subpantallas]` está en el panel; por debajo de 1280 px arranca plegado y las subpantallas son íconos con `aria-label`), y lo que buscaba «Pozos y equipos» o «Portafolio completo» (ahora «Equipos» y «Todos mis campos»). `header button[aria-label^="Período"]` y «DATOS DE DEMOSTRACIÓN» en `main` se mantienen.
- `.oxlintrc.json`: C2 y C3 piden la regla de `@/entities/planta-viva` y `@/entities/hoy` y sus `pedir*` (no los agregué).
- Una puerta sin pantallas para el rol no se pinta: el gerente ve La planta viva · Resultados (su Equipos llega con la pantalla `equipos` de C4) y regulatorio, Reporte · La planta viva (su Resultados, con C5). Al registrar `equipos` y `resultados`, van en `pantallas.tsx`, primeras en los `miembros` de su puerta, y en `pantallas` de cada rol.
- `hoy` no suma campos (`agrega`): el jefe o confiabilidad en «Todos mis campos» ven «elija un campo» en Hoy. Si la vista de C3 los suma, basta `agrega: true`.

**Pendiente:**
- Texto de SVG bajo 12 px: el esquema de la pantalla Planta (9 a 10,5 px a 1440) y, en el teléfono, las gráficas que se desplazan de lado (se dibujan más chicas): es la regla del auditor de C5 y el redibujo de las tandas 2 y 3.
- Los títulos de panel siguen en MAYÚSCULAS (las e2e los buscan así) y quedan cabeceras de antes con raya y letra condensada dentro de las pantallas; el ciclo de Resumen todavía numera «1 Antes · 2 Durante · 3 Después».
- La franja: el interlock queda en cero y «sin comunicación» solo ve el medidor oficial hasta que el motor tenga la vigencia de cada tag y las protecciones (X2 §7).
- «producidos ayer» salió de la cabecera (X4 §3.5): sigue en la lista de campos del panel.
- La primera subpantalla repite el nombre de su puerta («Hoy» dentro de Hoy) mientras las pantallas no se fusionen.

**Cierre de la tanda 1 (lo que pidió el coordinador).** Los 8 casos de e2e que eran de C1, arreglados en el dibujo y no en la prueba, salvo las tres pruebas que buscaban el menú viejo:
- `widgets/choke/Tuberia.tsx`: «Sin identificar» de la tubería acostada (768 px) tiene 132 px, crece hacia abajo en vez de tapar su rótulo, y «Identificar» es un enlace; en la de pie (390 y 320 px), la columna de la cifra mide 90 px y ya no se sale.
- `widgets/produccion/Diaria.tsx`: el primer día arranca en el eje (se montaba sobre «9,0 k» en Firefox). `MesAMes`, `choke/Mensual` y `resumen/ResumenDirectivo`: la cifra de cada mes toma lo que cabe en su columna (con doce meses o más baja a 9–11).
- `pages/Riesgo.tsx`: a 390 px las dos columnas ceden ancho y la píldora del tipo no se monta sobre «cruza en».
- `Cabecera.tsx`: el período se lee entero también en el teléfono.
- `pantallas.tsx`: `hoy` lleva `agrega: true` (C3 suma campos); queda sin efecto la nota de arriba sobre «elija un campo».
- Pruebas ajustadas a cómo se busca ahora: `carril.spec.ts` (cada rol recorre sus puertas, sus subpantallas y su menú de persona, y alcanza lo mismo que antes más La planta viva y Hoy; la dirección vieja de supervisor lleva a su Hoy), `choke-produccion.spec.ts:114` («Agua» está en el panel, debajo de La planta viva) e `interfaz.spec.ts:266` (la píldora del período no se corta ni se sale, y la marca DEMO está en la cabecera).
- Corridos contra Vite en 5181: el auditor a 390, 768, 1024 y 1280 px (dev) y a 1280 px (Firefox); `carril`, `armazon`, `choke-produccion`, `choke-gerente-riesgo` e `interfaz` en dev, iPhone, Firefox y Safari donde aplica. Todo en verde. `tsc -b`, `oxlint src` y `npm test` en verde.
